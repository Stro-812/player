// Сборка для просмотра артефактом на claude.ai: относительные пути и страница без
// <html>/<head>/<body> — площадка сама оборачивает её в скелет документа.
// Service Worker, манифест и обложка для ленты там не работают и не публикуются.
// Запуск: npm run artifact [-- <папка с MP3>] → dist-artifact/
// С папкой MP3 с именами из episodes.json кладутся рядом со страницей (лимит площадки — 15 МБ на файл).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { podcast } from '../src/data/podcast';

const out = 'dist-artifact';
const audioDir = process.argv[2];
// Внешнее хранилище площадка не пускает (CSP), поэтому доступны только файлы рядом со страницей.
const files = audioDir ? podcast.episodes.map((e) => e.file).filter((f) => existsSync(join(audioDir, f))) : [];
const env = { ...process.env, VITE_NO_SW: '1', VITE_AUDIO_BASE: './audio/', VITE_ONLY_FILES: files.join(',') };
execFileSync('npx', ['vite', 'build', `--outDir=${out}`, '--emptyOutDir'], { stdio: 'inherit', env });

if (files.length) mkdirSync(`${out}/audio`, { recursive: true });
for (const file of files) {
  const src = join(audioDir!, file);
  if (statSync(src).size > 15 * 1024 * 1024) console.warn(`${file} больше 15 МБ — площадка его не примет`);
  copyFileSync(src, `${out}/audio/${file}`);
  console.log(`build-artifact: audio/${file}`);
}

for (const f of ['sw.js', 'manifest.webmanifest', 'cover-3000.jpg', 'robots.txt']) rmSync(`${out}/${f}`, { force: true });

const html = readFileSync(`${out}/index.html`, 'utf8');
const head = html.match(/<head>([\s\S]*)<\/head>/)![1]!;
const body = html.match(/<body>([\s\S]*)<\/body>/)![1]!;
const keep = head
  .split('\n')
  .filter((l) => /<title>|name="robots"|rel="stylesheet"|rel="preload"|<script/.test(l))
  .map((l) => l.trim());
writeFileSync(`${out}/index.html`, [...keep, body.trim(), ''].join('\n'));
console.log(`build-artifact: ${out}/index.html`);
