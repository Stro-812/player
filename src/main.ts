import './ui/styles.css';
import { detectInAppBrowser, detectOs } from './env/inAppBrowser';
import { renderTeaser } from './ui/teaser';
import { renderPlay } from './ui/play';
import { renderEpisodes } from './ui/episodes';
import { renderOpenInBrowser } from './ui/openInBrowser';

const root = document.getElementById('app')!;
const ua = navigator.userAgent;

// Этап 2: перед #/play встанет проверка входа; ссылки в интерфейсе не меняются.
type Screen = (el: HTMLElement) => void | (() => void);
const routes: Record<string, Screen> = {
  '#/': renderTeaser,
  '#/play': renderPlay,
  '#/episodes': renderEpisodes,
};

let cleanup: (() => void) | void;

function route(): void {
  cleanup?.();
  cleanup = undefined;
  if (detectInAppBrowser(ua, window)) {
    renderOpenInBrowser(root, detectOs(ua));
    return;
  }
  cleanup = (routes[location.hash] ?? renderTeaser)(root);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();

// В артефакте claude.ai Service Worker запрещён, там его сборка выключена (VITE_NO_SW).
if ('serviceWorker' in navigator && import.meta.env.PROD && !import.meta.env.VITE_NO_SW) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
