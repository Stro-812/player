import { getAudioUrl } from './getAudioUrl';
import { podcast, type Episode } from '../data/podcast';
import { progressStore } from '../state/progressStore';
import { settings } from '../state/settings';

/**
 * Единственный <audio> на всё приложение. Прямой MP3, без Web Audio, MSE и HLS:
 * только так звук надёжно идёт с погашенным экраном на iOS и Android.
 */
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const SAVE_EVERY_MS = 10_000;
const DONE_TAIL_SEC = 30;
export const RESUME_REWIND_SEC = 5;
export const SKIP_BACK_SEC = 15;
export const SKIP_FORWARD_SEC = 30;
export const SPEEDS = [1, 1.25, 1.5] as const;

const audio = new Audio();
audio.preload = 'metadata';
audio.preservesPitch = true;

let current: Episode | null = null;
let retries = 0;
let lastSave = 0;
let failed = false;
/** Слушатель хочет, чтобы звук шёл: после сбоя сети продолжаем сами. */
let wantPlaying = false;

export type PlayerEvent = 'state' | 'time';
const listeners = new Set<(e: PlayerEvent) => void>();
export function onPlayer(fn: (e: PlayerEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = (e: PlayerEvent): void => listeners.forEach((fn) => fn(e));

/** Файл эпизода загружен и измерен (durationSec заполняет scripts/probe-audio.ts). */
export const isAvailable = (ep: Episode): boolean => ep.durationSec > 0;

/** С какого эпизода продолжать: последний, который слушали; если он дослушан — следующий. */
export function resumeEpisode(): Episode {
  const available = podcast.episodes.filter(isAvailable);
  const fallback = available[0] ?? podcast.episodes[0]!;
  const recent = Object.entries(progressStore.all()).sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
  if (!recent) return fallback;
  const ep = available.find((e) => e.n === Number(recent[0]));
  if (!ep) return fallback;
  if (!recent[1].done) return ep;
  return available.find((e) => e.n > ep.n) ?? ep;
}

export const player = {
  audio,
  get episode(): Episode | null {
    return current;
  },
  get failed(): boolean {
    return failed;
  },
  get playing(): boolean {
    return !audio.paused;
  },
  /** Длительность: из файла, пока он не загружен — из episodes.json. */
  get duration(): number {
    return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (current?.durationSec ?? 0);
  },
  /** Позиция: до загрузки метаданных — та, с которой эпизод начнётся. */
  get position(): number {
    return audio.readyState >= HTMLMediaElement.HAVE_METADATA ? audio.currentTime : pendingSeek;
  },

  async load(episode: Episode, startAt?: number): Promise<void> {
    if (current) save();
    current = episode;
    retries = 0;
    failed = false;
    const progress = progressStore.all()[episode.n];
    const from = startAt ?? (progress && !progress.done ? Math.max(0, progress.pos - RESUME_REWIND_SEC) : 0);
    audio.src = await getAudioUrl(episode);
    audio.playbackRate = settings.speed;
    seekWhenReady(from);
    updateMediaSession();
    emit('state');
    emit('time');
  },

  /** Подготовить эпизод для продолжения, если ничего не загружено. */
  async prepare(): Promise<void> {
    if (!current) await player.load(resumeEpisode());
  },

  /** Вызывать из обработчика нажатия: автостарт браузеры запрещают. */
  play(): Promise<void> {
    wantPlaying = true;
    if (failed && current) {
      // После трёх неудачных попыток — свежая ссылка и продолжение с того же места.
      failed = false;
      retries = 0;
      const at = player.position;
      const ep = current;
      emit('state');
      return getAudioUrl(ep).then((url) => {
        audio.src = url;
        seekWhenReady(at);
        return audio.play();
      });
    }
    return audio.play().catch((err: unknown) => {
      wantPlaying = false;
      emit('state');
      throw err;
    });
  },
  pause(): void {
    wantPlaying = false;
    audio.pause();
  },
  toggle(): void {
    if (audio.paused || failed) void player.play().catch(() => {});
    else player.pause();
  },
  seekTo(t: number): void {
    const to = Math.min(Math.max(0, t), player.duration || t);
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) audio.currentTime = to;
    else seekWhenReady(to);
    save();
    updatePosition();
    emit('time');
  },
  seekBy(delta: number): void {
    player.seekTo(player.position + delta);
  },
  setSpeed(rate: number): void {
    settings.speed = rate;
    audio.playbackRate = rate;
    updatePosition();
  },
  next: (): Promise<void> => goTo(1, true),
  previous: (): Promise<void> => goTo(-1, false),
};

let pendingSeek = 0;
function seekWhenReady(t: number): void {
  pendingSeek = Math.max(0, t);
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) audio.currentTime = pendingSeek;
  else if (t > 0) audio.addEventListener('loadedmetadata', () => (audio.currentTime = pendingSeek), { once: true });
}

function save(): void {
  if (!current || audio.readyState < HTMLMediaElement.HAVE_METADATA) return;
  progressStore.set(current.n, audio.currentTime);
  if (audio.duration && audio.duration - audio.currentTime < DONE_TAIL_SEC) progressStore.markDone(current.n);
  lastSave = Date.now();
}

function neighbour(delta: number): Episode | undefined {
  if (!current) return undefined;
  const n = current.n;
  const list = podcast.episodes.filter(isAvailable);
  return delta > 0 ? list.find((e) => e.n > n) : list.filter((e) => e.n < n).at(-1);
}

async function goTo(delta: number, fromStart: boolean): Promise<void> {
  const next = neighbour(delta);
  if (!next) return;
  const keepPlaying = wantPlaying;
  await player.load(next, fromStart ? 0 : undefined);
  if (keepPlaying) await player.play().catch(() => {});
}

audio.addEventListener('timeupdate', () => {
  if (Date.now() - lastSave >= SAVE_EVERY_MS) save();
  emit('time');
});
audio.addEventListener('pause', () => {
  save();
  emit('state');
});
audio.addEventListener('play', () => emit('state'));
audio.addEventListener('playing', () => {
  retries = 0;
  emit('state');
});
audio.addEventListener('ratechange', () => emit('state'));
audio.addEventListener('loadedmetadata', () => emit('time'));
audio.addEventListener('ended', () => {
  if (current) progressStore.markDone(current.n);
  // Тот же элемент получает новый src и сразу play(): так переход работает при погашенном экране.
  wantPlaying = neighbour(1) !== undefined;
  void goTo(1, true);
  emit('state');
});

// Ошибка сети или истёкшая ссылка (этап 2): новая ссылка и продолжение с того же места.
audio.addEventListener('error', () => {
  if (!current) return;
  const delay = RETRY_DELAYS_MS[retries];
  if (delay === undefined) {
    failed = true;
    emit('state');
    return;
  }
  retries += 1;
  const ep = current;
  const at = player.position;
  setTimeout(async () => {
    if (current !== ep) return;
    audio.src = await getAudioUrl(ep);
    seekWhenReady(at);
    if (wantPlaying) audio.play().catch(() => {});
  }, delay);
});

const saveOnHide = (): void => save();
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && saveOnHide());
window.addEventListener('pagehide', saveOnHide);

function updateMediaSession(): void {
  if (!('mediaSession' in navigator) || !current) return;
  // Обложка от адреса сайта: в артефакте и в подпапке сайт живёт не в корне домена.
  const base = new URL(import.meta.env.BASE_URL, location.href);
  const art = (size: number): MediaImage => ({
    src: new URL(`cover-${size}.jpg`, base).href,
    sizes: `${size}x${size}`,
    type: 'image/jpeg',
  });
  navigator.mediaSession.metadata = new MediaMetadata({
    title: current.title,
    artist: podcast.podcast.author,
    album: podcast.podcast.title,
    artwork: [art(512), art(1024)],
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
    ['play', () => void player.play().catch(() => {})],
    ['pause', () => player.pause()],
    ['seekbackward', (d) => player.seekBy(-(d.seekOffset ?? SKIP_BACK_SEC))],
    ['seekforward', (d) => player.seekBy(d.seekOffset ?? SKIP_FORWARD_SEC)],
    ['previoustrack', () => void player.previous()],
    ['nexttrack', () => void player.next()],
    ['seekto', (d) => d.seekTime !== undefined && player.seekTo(d.seekTime)],
  ];
  for (const [action, fn] of handlers) {
    try {
      ms.setActionHandler(action, fn);
    } catch {
      // Действие не поддерживается этим браузером.
    }
  }
}
