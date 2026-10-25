import { describe, expect, it } from 'vitest';
import { chromeIntentUrl, detectInAppBrowser, detectOs } from './inAppBrowser';

// Образцы строк. Дополнять реальными с телефонов партнёров.
const UA = {
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iosInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 380.0.0.0.0',
  iosFacebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/500.0.0.0]',
  androidTelegram:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Mobile Safari/537.36 Telegram-Android/11.9.0',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; 23078PND5G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Mobile Safari/537.36',
};

describe('inAppBrowser', () => {
  it('узнаёт встроенные браузеры', () => {
    expect(detectInAppBrowser(UA.iosInstagram)).toBe('instagram');
    expect(detectInAppBrowser(UA.iosFacebook)).toBe('facebook');
    expect(detectInAppBrowser(UA.androidTelegram)).toBe('telegram');
  });

  it('обычные браузеры не трогает', () => {
    expect(detectInAppBrowser(UA.iosSafari)).toBeNull();
    expect(detectInAppBrowser(UA.androidChrome)).toBeNull();
  });

  it('Telegram на iOS без метки узнаётся по мосту в window', () => {
    expect(detectInAppBrowser(UA.iosSafari, { TelegramWebviewProxy: {} } as unknown as Window)).toBe('telegram');
  });

  it('определяет систему', () => {
    expect(detectOs(UA.iosSafari)).toBe('ios');
    expect(detectOs(UA.androidChrome)).toBe('android');
  });

  it('intent-ссылка на Chrome', () => {
    expect(chromeIntentUrl('https://example.org/?a=1#/play')).toBe(
      'intent://example.org/?a=1#Intent;scheme=https;package=com.android.chrome;end',
    );
  });
});
