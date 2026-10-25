import { describe, expect, it } from 'vitest';
import { clock, minutesWord, speedLabel } from './format';

describe('format', () => {
  it('clock', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(1394.7)).toBe('23:14');
    expect(clock(4440)).toBe('74:00');
  });
  it('minutesWord — «из N минут/минуты»', () => {
    expect(minutesWord(74)).toBe('минут');
    expect(minutesWord(21)).toBe('минуты');
    expect(minutesWord(11)).toBe('минут');
    expect(minutesWord(16)).toBe('минут');
  });
  it('speedLabel', () => {
    expect(speedLabel(1.25)).toBe('1,25×');
    expect(speedLabel(1)).toBe('1×');
  });
});
