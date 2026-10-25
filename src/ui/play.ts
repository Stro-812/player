import { isAvailable, onPlayer, player, SKIP_BACK_SEC, SKIP_FORWARD_SEC, SPEEDS } from '../audio/player';
import { podcast } from '../data/podcast';
import { progressStore } from '../state/progressStore';
import { settings } from '../state/settings';
import { clock, esc, minutes, minutesWord, speedLabel } from './format';
import { mountInstallHint } from './installHint';

// Плеер (#/play): одна главная кнопка внизу, под большой палец.
export function renderPlay(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="screen play">
      <header class="play-head">
        <a class="brand" href="#/">Не про бег</a>
      </header>
      <p class="meta" id="ep-meta"></p>
      <h1 class="ep-title" id="ep-title"></h1>
      <p class="time" id="time">0:00</p>
      <label class="visually-hidden" for="seek">Позиция в эпизоде</label>
      <input class="seek" id="seek" type="range" min="0" max="1" step="1" value="0" />
      <p class="meta" id="remain"></p>
      <div class="book" id="book" aria-label="Прогресс по книге"></div>
      <p class="alert" id="alert" hidden>Звук прервался: нет связи с сервером. Проверьте интернет и нажмите «Продолжить».</p>
      <div id="install"></div>

      <div class="controls">
        <div class="row">
          <button class="btn-outline" id="back" type="button" aria-label="Назад на ${SKIP_BACK_SEC} секунд">−${SKIP_BACK_SEC}</button>
          <button class="btn-outline" id="speed" type="button" aria-label="Скорость"></button>
          <button class="btn-outline" id="fwd" type="button" aria-label="Вперёд на ${SKIP_FORWARD_SEC} секунд">+${SKIP_FORWARD_SEC}</button>
        </div>
        <button class="btn-main" id="toggle" type="button">Продолжить</button>
        <a class="link" href="#/episodes">Все эпизоды</a>
      </div>
    </div>
  `;

  const $ = <T extends HTMLElement>(id: string): T => root.querySelector<T>(`#${id}`)!;
  const seek = $<HTMLInputElement>('seek');
  const toggle = $<HTMLButtonElement>('toggle');
  const speed = $<HTMLButtonElement>('speed');
  let dragging = false;

  function renderState(): void {
    const ep = player.episode;
    if (!ep) return;
    $('ep-meta').textContent = `Эпизод ${ep.n} из ${podcast.episodes.length}`;
    $('ep-title').textContent = ep.title;
    toggle.textContent = player.playing && !player.failed ? 'Пауза' : 'Продолжить';
    speed.textContent = speedLabel(settings.speed);
    $('alert').hidden = !player.failed;
    renderBook();
  }

  function renderTime(): void {
    const dur = player.duration;
    const pos = dragging ? Number(seek.value) : player.position;
    $('time').textContent = clock(pos);
    seek.max = String(Math.max(1, Math.floor(dur)));
    if (!dragging) seek.value = String(Math.floor(pos));
    seek.style.setProperty('--p', `${dur ? (pos / dur) * 100 : 0}%`);
    const m = minutes(dur);
    $('remain').textContent = dur ? `осталось ${clock(dur - pos)} из ${m} ${minutesWord(m)}` : '';
  }

  function renderBook(): void {
    const all = progressStore.all();
    const cur = player.episode?.n;
    $('book').innerHTML = podcast.episodes
      .map((e) => {
        const p = all[e.n];
        const fill = p?.done ? 100 : e.durationSec && p ? Math.min(100, (p.pos / e.durationSec) * 100) : 0;
        return `<span class="seg${e.n === cur ? ' is-current' : ''}${isAvailable(e) ? '' : ' is-off'}" title="Эпизод ${e.n}: ${esc(e.title)}"><i style="width:${fill}%"></i></span>`;
      })
      .join('');
  }

  toggle.addEventListener('click', () => player.toggle());
  $('back').addEventListener('click', () => player.seekBy(-SKIP_BACK_SEC));
  $('fwd').addEventListener('click', () => player.seekBy(SKIP_FORWARD_SEC));
  speed.addEventListener('click', () => {
    const i = SPEEDS.indexOf(settings.speed as (typeof SPEEDS)[number]);
    player.setSpeed(SPEEDS[(i + 1) % SPEEDS.length]!);
    renderState();
  });
  seek.addEventListener('input', () => {
    dragging = true;
    renderTime();
  });
  seek.addEventListener('change', () => {
    dragging = false;
    player.seekTo(Number(seek.value));
  });

  const offPlayer = onPlayer((e) => (e === 'time' ? renderTime() : (renderState(), renderTime())));
  const offInstall = mountInstallHint($('install'));
  void player.prepare().then(() => {
    renderState();
    renderTime();
  });
  renderState();
  renderTime();

  return () => {
    offPlayer();
    offInstall();
  };
}
