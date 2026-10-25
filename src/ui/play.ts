import { player } from '../audio/player';
import { podcast } from '../data/podcast';
import { progressStore } from '../state/progressStore';
import { RESUME_REWIND_SEC } from '../audio/player';

// Плеер (#/play). Заготовка: одна кнопка, которая продолжает последний эпизод.
export function renderPlay(root: HTMLElement): void {
  root.innerHTML = `
    <p class="brand">Не про бег</p>
    <p id="ep-meta"></p>
    <h1 class="big-white" id="ep-title"></h1>
    <button class="btn-main" id="toggle" type="button">Продолжить</button>
    <p><a href="#/episodes">Все эпизоды</a></p>
  `;
  const ep = player.episode ?? lastEpisode();
  root.querySelector('#ep-meta')!.textContent = `Эпизод ${ep.n} из ${podcast.episodes.length}`;
  root.querySelector('#ep-title')!.textContent = ep.title;

  const btn = root.querySelector<HTMLButtonElement>('#toggle')!;
  btn.addEventListener('click', async () => {
    if (player.episode?.n !== ep.n) await player.load(ep, Math.max(0, progressStore.get(ep.n) - RESUME_REWIND_SEC));
    if (player.audio.paused) await player.play();
    else player.pause();
    btn.textContent = player.audio.paused ? 'Продолжить' : 'Пауза';
  });
}

function lastEpisode() {
  const all = progressStore.all();
  const recent = Object.entries(all).sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
  const n = recent ? Number(recent[0]) : podcast.episodes[0]!.n;
  return podcast.episodes.find((e) => e.n === n) ?? podcast.episodes[0]!;
}
