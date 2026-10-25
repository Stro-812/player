// Сборка для просмотра артефактом на claude.ai: относительные пути и страница без
// <html>/<head>/<body> — площадка сама оборачивает её в скелет документа.
// Service Worker, манифест и обложка для ленты там не работают и не публикуются.
// Запуск: npm run artifact → dist-artifact/
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const out = 'dist-artifact';
execFileSync('npx', ['vite', 'build', '--base=./', `--outDir=${out}`, '--emptyOutDir'], { stdio: 'inherit' });

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
