import { chromeIntentUrl, type MobileOs } from '../env/inAppBrowser';

// Экран «Откройте в браузере». Состояние, а не маршрут.
export function renderOpenInBrowser(root: HTMLElement, os: MobileOs): void {
  const browser = os === 'android' ? 'Chrome' : 'Safari';
  root.innerHTML = `
    <h1 class="big-white">Откройте в ${browser}</h1>
    <ol>
      <li>Нажмите «⋯» в правом верхнем углу.</li>
      <li>Выберите «Открыть в ${browser}».</li>
    </ol>
    <button class="btn-main" id="copy" type="button">Скопировать ссылку</button>
  `;
  root.querySelector('#copy')!.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = 'Ссылка скопирована';
    } catch {
      prompt('Скопируйте ссылку', location.href);
    }
  });
  if (os === 'android') location.href = chromeIntentUrl(location.href);
}
