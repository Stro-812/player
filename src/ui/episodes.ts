import { podcast } from '../data/podcast';
import { progressStore } from '../state/progressStore';

// Список эпизодов (#/episodes). Заготовка.
export function renderEpisodes(root: HTMLElement): void {
  const progress = progressStore.all();
  root.innerHTML = `<p class="brand">Не про бег</p><ol id="list"></ol><p><a href="#/play">К плееру</a></p>`;
  const list = root.querySelector('#list')!;
  for (const ep of podcast.episodes) {
    const li = document.createElement('li');
    li.textContent = `${ep.n}. ${ep.title}${progress[ep.n]?.done ? ' — Прослушан' : ''}`;
    list.append(li);
  }
}
