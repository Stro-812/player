import { progressStore } from '../state/progressStore';
import { settings } from '../state/settings';
import { detectOs } from '../env/inAppBrowser';

// Предложение поставить сайт на домашний экран — после первого прослушивания.
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

let deferred: InstallPromptEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
});

const LISTENED_SEC = 60;

function standalone(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function mountInstallHint(slot: HTMLElement): () => void {
  const os = detectOs(navigator.userAgent);
  function render(): void {
    const listened = Object.values(progressStore.all()).some((p) => p.done || p.pos >= LISTENED_SEC);
    const can = os === 'ios' || deferred !== null;
    if (!listened || !can || standalone() || settings.installHintDismissed) {
      slot.innerHTML = '';
      return;
    }
    slot.innerHTML =
      os === 'ios'
        ? `<div class="card hint"><p>Чтобы открывать подкаст одним нажатием, добавьте его на экран «Домой»: кнопка «Поделиться», затем «На экран „Домой“».</p><button class="link-btn" type="button" data-close>Понятно</button></div>`
        : `<div class="card hint"><p>Поставьте подкаст на главный экран — он будет открываться как приложение.</p><div class="hint-row"><button class="btn-small" type="button" data-install>Установить</button><button class="link-btn" type="button" data-close>Не сейчас</button></div></div>`;
  }
  slot.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-install]') && deferred) {
      await deferred.prompt();
      deferred = null;
    }
    if (t.closest('[data-close]') || t.closest('[data-install]')) {
      settings.installHintDismissed = true;
      render();
    }
  });
  render();
  const timer = setInterval(render, 15_000);
  return () => clearInterval(timer);
}
