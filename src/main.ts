import './ui/styles.css';
import { detectInAppBrowser, detectOs } from './env/inAppBrowser';
import { renderTeaser } from './ui/teaser';
import { renderPlay } from './ui/play';
import { renderEpisodes } from './ui/episodes';
import { renderOpenInBrowser } from './ui/openInBrowser';

const root = document.getElementById('app')!;
const ua = navigator.userAgent;

// Этап 2: перед #/play встанет проверка входа; ссылки в интерфейсе не меняются.
const routes: Record<string, (el: HTMLElement) => void> = {
  '#/': renderTeaser,
  '#/play': renderPlay,
  '#/episodes': renderEpisodes,
};

function route(): void {
  if (detectInAppBrowser(ua, window)) {
    renderOpenInBrowser(root, detectOs(ua));
    return;
  }
  (routes[location.hash] ?? renderTeaser)(root);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // В артефакте claude.ai Service Worker запрещён: ошибку регистрации глотаем.
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
