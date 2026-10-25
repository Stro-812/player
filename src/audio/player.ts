import { getAudioUrl } from './getAudioUrl';
import { podcast, type Episode } from '../data/podcast';
import { progressStore } from '../state/progressStore';

/**
 * Единственный <audio> на всё приложение. Прямой MP3, без Web Audio, MSE и HLS:
 * только так звук надёжно идёт с погашенным экраном на iOS и Android.
 */
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const SAVE_EVERY_MS = 10_000;
const DONE_TAIL_SEC = 30;
export const RESUME_REWIND_SEC = 5;
export const SPEEDS = [1, 1.25, 1.5] as const;

const audio = new Audio();
audio.preload = 'metadata';
audio.preservesPitch = true;

let current: Episode | null = null;
let retries = 0;
let lastSave = 0;
/** Слушатель хочет, чтобы звук шёл: после сбоя сети продолжаем сами. */
let wantPlaying = false;

export type PlayerEvent = 'state' | 'time' | 'failed';
const listeners = new Set<(e: PlayerEvent) => void>();
export function onPlayer(fn: (e: PlayerEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = (e: PlayerEvent): void => listeners.forEach((fn) => fn(e));

export const player = {
  audio,
  get episode(): Episode | null {
    return current;
  },

  async load(episode: Episode, startAt = 0): Promise<void> {
    current = episode;
    retries = 0;
    audio.src = await getAudioUrl(episode);
    seekWhenReady(startAt);
    updateMediaSession();
    emit('state');
  },

  /** Вызывать только из обработчика нажатия: автостарт браузеры запрещают. */
  play(): Promise<void> {
    wantPlaying = true;
    return audio.play();
  },
  pause(): void {
    wantPlaying = false;
    audio.pause();
  },
  seekBy(delta: number): void {
    audio.currentTime = Math.max(0, audio.currentTime + delta);
    updatePosition();
  },
  setSpeed(rate: number): void {
    audio.playbackRate = rate;
    updatePosition();
  },
};

function seekWhenReady(t: number): void {
  if (t <= 0) return;
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) audio.currentTime = t;
  else audio.addEventListener('loadedmetadata', () => (audio.currentTime = t), { once: true });
}

function save(): void {
  if (!current) return;
  progressStore.set(current.n, audio.currentTime);
  if (audio.duration && audio.duration - audio.currentTime < DONE_TAIL_SEC) progressStore.markDone(current.n);
  lastSave = Date.now();
}

function neighbour(delta: number): Episode | undefined {
  if (!current) return undefined;
  return podcast.episodes.find((e) => e.n === current!.n + delta);
}

async function goTo(delta: number, autoplay: boolean): Promise<void> {
  const next = neighbour(delta);
  if (!next) return;
  save();
  await player.load(next, progressStore.get(next.n));
  if (autoplay) await player.play();
}

audio.addEventListener('timeupdate', () => {
  if (Date.now() - lastSave >= SAVE_EVERY_MS) save();
  emit('time');
});
audio.addEventListener('pause', () => { save(); emit('state'); });
audio.addEventListener('play', () => emit('state'));
audio.addEventListener('ratechange', () => emit('state'));
audio.addEventListener('ended', () => {
  if (current) progressStore.markDone(current.n);
  // Тот же элемент получает новый src и сразу play(): так переход работает при погашенном экране.
  void goTo(1, true);
});

// Ошибка сети или истёкшая ссылка (этап 2): новая ссылка и продолжение с того же места.
audio.addEventListener('error', () => {
  if (!current) return;
  const delay = RETRY_DELAYS_MS[retries];
  if (delay === undefined) {
    emit('failed');
    return;
  }
  retries += 1;
  const ep = current;
  const at = audio.currentTime;
  setTimeout(async () => {
    if (current !== ep) return;
    audio.src = await getAudioUrl(ep);
    seekWhenReady(at);
    if (wantPlaying) audio.play().catch(() => emit('failed'));
  }, delay);
});
audio.addEventListener('playing', () => (retries = 0));

const saveOnHide = (): void => save();
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && saveOnHide());
window.addEventListener('pagehide', saveOnHide);

function updateMediaSession(): void {
  if (!('mediaSession' in navigator) || !current) return;
  // Обложка от адреса сайта: в артефакте и в подпапке сайт живёт не в корне домена.
  const art = new URL(podcast.podcast.artwork.replace(/^\//, ''), new URL(import.meta.env.BASE_URL, location.href)).href;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: current.title,
    artist: podcast.podcast.author,
    album: podcast.podcast.title,
    artwork: [
      { src: art.replace('1024', '512'), sizes: '512x512', type: 'image/jpeg' },
      { src: art, sizes: '1024x1024', type: 'image/jpeg' },
    ],
  });
}

function updatePosition(): void {
  if (!('mediaSession' in navigator) || !Number.isFinite(audio.duration)) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      position: Math.min(audio.currentTime, audio.duration),
      playbackRate: audio.playbackRate,
    });
  } catch {
    // Safari бросает исключение на несогласованных значениях во время загрузки.
  }
}
audio.addEventListener('loadedmetadata', updatePosition);
audio.addEventListener('seeked', updatePosition);

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ['play', () => void player.play()],
    ['pause', () => player.pause()],
    ['seekbackward', (d) => player.seekBy(-(d.seekOffset ?? 15))],
    ['seekforward', (d) => player.seekBy(d.seekOffset ?? 30)],
    ['previoustrack', () => void goTo(-1, !audio.paused)],
    ['nexttrack', () => void goTo(1, !audio.paused)],
    ['seekto', (d) => {
      if (d.seekTime !== undefined) audio.currentTime = d.seekTime;
      updatePosition();
    }],
  ];
  for (const [action, fn] of handlers) {
    try {
      ms.setActionHandler(action, fn);
    } catch {
      // Действие не поддерживается этим браузером.
    }
  }
}
