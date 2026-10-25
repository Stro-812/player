import { describe, expect, it } from 'vitest';
import { createProgressStore } from './progressStore';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('progressStore', () => {
  it('без записи позиция 0', () => {
    expect(createProgressStore(memoryStorage()).get(3)).toBe(0);
  });

  it('сохраняет позицию и переживает новый экземпляр', () => {
    const storage = memoryStorage();
    createProgressStore(storage).set(10, 1394.5);
    expect(createProgressStore(storage).get(10)).toBe(1394.5);
  });

  it('markDone не теряет позицию, set не снимает отметку', () => {
    const s = createProgressStore(memoryStorage());
    s.set(2, 100);
    s.markDone(2);
    s.set(2, 120);
    expect(s.all()[2]).toMatchObject({ pos: 120, done: true });
  });

  it('all() отдаёт время записи для выбора последнего эпизода', () => {
    let t = 1000;
    const s = createProgressStore(memoryStorage(), () => t);
    s.set(1, 10);
    t = 2000;
    s.set(5, 20);
    const last = Object.entries(s.all()).sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0]!;
    expect(last[0]).toBe('5');
  });

  it('работает без хранилища и при ошибках записи', () => {
    const s = createProgressStore(null);
    s.set(4, 30);
    expect(s.get(4)).toBe(30);

    const broken = createProgressStore({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => broken.set(1, 5)).not.toThrow();
  });

  it('отрицательная позиция приводится к 0', () => {
    const s = createProgressStore(memoryStorage());
    s.set(1, -3);
    expect(s.get(1)).toBe(0);
  });
});
