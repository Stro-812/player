/** 23:14, 74:00 — минуты без перевода в часы, как в макете. */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function minutes(sec: number): number {
  return Math.round(sec / 60);
}

/** 1 → «минуты», 5 → «минут»: «из 74 минут», «из 21 минуты». */
export function minutesWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'минуты';
  return 'минут';
}

export function speedLabel(rate: number): string {
  return `${String(rate).replace('.', ',')}×`;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ESC[c]!);
