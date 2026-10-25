// Заполняет durationSec и bytes в episodes.json по самим MP3 через ffprobe.
// Только читает файлы, ничего в них не меняет.
// Запуск: npm run probe -- <папка с 01.mp3 … 11.mp3>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PodcastData } from '../src/data/podcast';

const dir = process.argv[2];
if (!dir) {
  console.error('Укажите папку с MP3: npm run probe -- ./audio');
  process.exit(1);
}

const path = 'src/data/episodes.json';
const data = JSON.parse(readFileSync(path, 'utf8')) as PodcastData;

for (const ep of data.episodes) {
  const file = join(dir, ep.file);
  if (!existsSync(file)) {
    console.warn(`нет файла: ${file}`);
    continue;
  }
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,bit_rate', '-of', 'json', file], { encoding: 'utf8' });
  const fmt = (JSON.parse(out) as { format: { duration: string; bit_rate: string } }).format;
  ep.durationSec = Math.round(Number(fmt.duration));
  ep.bytes = statSync(file).size;
  console.log(`${ep.file}: ${ep.durationSec} с, ${(ep.bytes / 1e6).toFixed(1)} МБ, ${Math.round(Number(fmt.bit_rate) / 1000)} кбит/с`);
}

writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
