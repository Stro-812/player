// Раздаёт сайт вместе с MP3 со своего компьютера по временному адресу https — для проверки на телефонах.
// Запуск: npm run share -- "<папка с MP3>"
//
// 1. Собирает сайт так, что звук берётся с того же адреса: /audio/<файл>.
// 2. Копирует MP3 из папки в dist/audio (в git они не попадают).
// 3. Запускает локальный сервер (vite preview: отвечает 206 на Range, перемотка работает).
// 4. Если установлен cloudflared, открывает временный туннель и печатает адрес https://….trycloudflare.com.
//
// Пока команда работает, компьютер не должен засыпать. Адрес туннеля меняется при каждом запуске,
// а позиции прослушивания привязаны к адресу — после перезапуска они на телефоне начнутся с нуля.
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { podcast } from '../src/data/podcast';

const PORT = 4173;
const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error('Укажите папку с MP3: npm run share -- "$HOME/Desktop/не про бег"');
  process.exit(1);
}

const present = new Set(readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.mp3')));
const expected = podcast.episodes.map((e) => e.file);
const matched = expected.filter((f) => present.has(f));
const extra = [...present].filter((f) => !expected.includes(f));

if (matched.length === 0) {
  console.error(`В папке нет файлов с ожидаемыми именами (${expected.slice(0, 3).join(', ')} … ${expected.at(-1)}).`);
  if (extra.length) console.error(`Найдено: ${extra.join(', ')}\nПереименуйте файлы по номеру эпизода: 01.mp3 … 11.mp3.`);
  process.exit(1);
}
if (extra.length) console.warn(`Пропускаю файлы не по схеме имён: ${extra.join(', ')}`);

// Длительность и размер — в episodes.json, если есть ffprobe.
try {
  execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
  execFileSync('npx', ['tsx', 'scripts/probe-audio.ts', dir], { stdio: 'inherit' });
} catch {
  console.warn('ffprobe не найден — длительность эпизодов не заполнена (на плеер не влияет).');
}

execFileSync('npx', ['vite', 'build'], { stdio: 'inherit', env: { ...process.env, VITE_AUDIO_BASE: '/audio/' } });
mkdirSync('dist/audio', { recursive: true });
for (const f of matched) copyFileSync(join(dir, f), join('dist/audio', f));
console.log(`\nЭпизоды с файлами: ${matched.join(', ')}`);

const server = spawn('npx', ['vite', 'preview', '--host', '--port', String(PORT), '--strictPort'], { stdio: 'inherit' });

let tunnel: ReturnType<typeof spawn> | null = null;
try {
  execFileSync('cloudflared', ['--version'], { stdio: 'ignore' });
  tunnel = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`]);
  const onLog = (buf: Buffer): void => {
    const url = buf.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
    if (url) console.log(`\n  Адрес для телефона: ${url}\n  Остановить: Ctrl+C\n`);
  };
  tunnel.stderr?.on('data', onLog);
  tunnel.stdout?.on('data', onLog);
} catch {
  console.log(
    `\ncloudflared не установлен — сайт доступен только в домашней сети: http://<IP компьютера>:${PORT}` +
      '\nБез https не работают установка на экран и Service Worker. Установить: brew install cloudflared' +
      ' (Windows: winget install Cloudflare.cloudflared) и запустить команду заново.\n',
  );
}

const stop = (): void => {
  tunnel?.kill();
  server.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
