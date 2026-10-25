/**
 * Признаки встроенных браузеров. Строки User-Agent сверить на телефонах партнёров
 * и дополнить: Telegram на iOS помечает себя не всегда.
 */
export type InAppBrowser = 'telegram' | 'instagram' | 'facebook';
export type MobileOs = 'ios' | 'android' | 'other';

const SIGNS: Array<[InAppBrowser, RegExp]> = [
  ['telegram', /Telegram/i],
  ['instagram', /Instagram/i],
  ['facebook', /FBAN|FBAV|FB_IAB|FBIOS/],
];

export function detectInAppBrowser(ua: string, win?: Window): InAppBrowser | null {
  for (const [name, re] of SIGNS) if (re.test(ua)) return name;
  // Telegram на Android и части iOS-версий добавляет в окно свой мост.
  if (win && ('TelegramWebview' in win || 'TelegramWebviewProxy' in win)) return 'telegram';
  return null;
}

export function detectOs(ua: string): MobileOs {
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

/**
 * Ссылка, которая на Android открывает страницу в Chrome.
 * Hash-маршрут не передаётся: второй «#» ломает разбор intent-ссылки.
 */
export function chromeIntentUrl(href: string): string {
  const u = new URL(href);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;end`;
}
