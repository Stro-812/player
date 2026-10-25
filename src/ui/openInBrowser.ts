import { chromeIntentUrl, type MobileOs } from '../env/inAppBrowser';

// Экран «Откройте в браузере». Состояние, а не маршрут: во встроенных браузерах
// Telegram, Instagram и Facebook звук останавливается при блокировке экрана.
export function renderOpenInBrowser(root: HTMLElement, os: MobileOs): void {
  const browser = os === 'android' ? 'Chrome' : 'Safari';
  const menu = os === 'android' ? '⋮' : '⋯';
  root.innerHTML = `
    <div class="screen">
      <a class="brand" href="#/">Не про бег</a>
      <h1 class="h1">Откройте в ${browser}</h1>
      <p class="lead">Во встроенном браузере звук останавливается, когда гаснет экран.</p>
      <ol class="steps card">
        <li><span class="step-n">1</span><span>Нажмите «${menu}» в углу экрана.</span></li>
        <li><span class="step-n">2</span><span>Выберите «Открыть в ${browser}»${os === 'ios' ? ' или «Открыть в браузере»' : ''}.</span></li>
      </ol>
      <div class="controls">
        <button class="btn-main" id="copy" type="button">Скопировать ссылку</button>
        <p class="meta" id="copied" hidden>Ссылка скопирована — вставьте её в ${browser}.</p>
      </div>
    </div>
  `;
  root.querySelector('#copy')!.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
    } catch {
      const input = document.createElement('input');
      input.value = location.href;
      document.body.append(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    (root.querySelector('#copied') as HTMLElement).hidden = false;
  });
  if (os === 'android') location.href = chromeIntentUrl(location.href);
}
