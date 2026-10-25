/**
 * Точка замены 2. Этап 1: localStorage.
 * Этап 2: та же запись плюс синхронизация с сервером.
 */
export interface Progress {
  /** Позиция в секундах. */
  pos: number;
  done: boolean;
  /** Время последней записи, мс. По нему выбирается эпизод при открытии. */
  updatedAt: number;
}

export interface ProgressStore {
  get(n: number): number;
  set(n: number, seconds: number): void;
  markDone(n: number): void;
  all(): Record<number, Progress>;
}

const KEY = 'npb:progress:v1';

export function createProgressStore(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
  now: () => number = Date.now,
): ProgressStore {
  // Если хранилище недоступно (приватный режим), позиции живут до закрытия вкладки.
  let memory: Record<number, Progress> = {};

  function read(): Record<number, Progress> {
    if (!storage) return memory;
    try {
      const raw = storage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Record<number, Progress>) : {};
    } catch {
      return memory;
    }
  }

  function write(all: Record<number, Progress>): void {
    memory = all;
    if (!storage) return;
    try {
      storage.setItem(KEY, JSON.stringify(all));
    } catch {
      // Переполнение или запрет записи: остаёмся на копии в памяти.
    }
  }

  return {
    get(n) {
      return read()[n]?.pos ?? 0;
    },
    set(n, seconds) {
      const all = read();
      all[n] = { pos: Math.max(0, seconds), done: all[n]?.done ?? false, updatedAt: now() };
      write(all);
    },
    markDone(n) {
      const all = read();
      all[n] = { pos: all[n]?.pos ?? 0, done: true, updatedAt: now() };
      write(all);
    },
    all() {
      return read();
    },
  };
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const progressStore: ProgressStore = createProgressStore(safeLocalStorage());
