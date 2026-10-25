/** Настройки слушателя в этом телефоне: скорость и скрытые подсказки. */
const KEY = 'npb:settings:v1';

interface Settings {
  speed: number;
  installHintDismissed: boolean;
}

const defaults: Settings = { speed: 1, installHintDismissed: false };

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

const state = read();

function write(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Без хранилища настройки живут до закрытия страницы.
  }
}

export const settings = {
  get speed(): number {
    return state.speed;
  },
  set speed(v: number) {
    state.speed = v;
    write();
  },
  get installHintDismissed(): boolean {
    return state.installHintDismissed;
  },
  set installHintDismissed(v: boolean) {
    state.installHintDismissed = v;
    write();
  },
};
