import { isAvailable, onPlayer, player, resumeEpisode } from '../audio/player';
import { podcast } from '../data/podcast';
import { progressStore } from '../state/progressStore';
import { clock, esc } from './format';

// Список эпизодов (#/episodes). Текущий — белая карточка.
export function renderEpisodes(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="screen">
      <header class="play-head">
        <a class="brand" href="#/">Не про бег</a>
      </header>
      <h1 class="h1">Эпизоды</h1>
      <ol class="episodes" id="list"></ol>
      <a class="link" href="#/play">К плееру</a>
    </div>
  `;
  const list = root.querySelector('#list')!;

  function render(): void {
    const all = progressStore.all();
    const current = (player.episode ?? resumeEpisode()).n;
    list.innerHTML = podcast.episodes
      .map((ep) => {
        const p = all[ep.n];
        const on = isAvailable(ep);
        let status = 'Скоро';
        if (on && p?.done) status = 'Прослушан';
        else if (on && p && p.pos > 0) status = `Остановились на ${clock(p.pos)} из ${clock(ep.durationSec)}`;
        else if (on) status = clock(ep.durationSec);
        return `<li>
          <button class="ep${ep.n === current ? ' is-current' : ''}" type="button" data-n="${ep.n}" ${on ? '' : 'disabled'}>
            <span class="ep-n">${ep.n}</span>
            <span class="ep-body"><span class="ep-name">${esc(ep.title)}</span><span class="ep-status">${status}</span></span>
          </button>
        </li>`;
      })
      .join('');
  }

  list.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-n]');
    if (!btn || btn.disabled) return;
    const ep = podcast.episodes.find((x) => x.n === Number(btn.dataset.n))!;
    if (player.episode?.n === ep.n) {
      void player.play().catch(() => {});
    } else {
      void player.load(ep).then(() => player.play().catch(() => {}));
    }
    location.hash = '#/play';
  });

  render();
  return onPlayer((e) => e === 'state' && render());
}
