// Собирает dist/feed-<FEED_SLUG>.xml из episodes.json. Без FEED_SLUG лента не собирается.
import { writeFileSync, existsSync } from 'node:fs';
import { podcast } from '../src/data/podcast';
import { buildFeed } from './feed';

const slug = process.env.FEED_SLUG?.trim();
const siteUrl = process.env.SITE_URL?.trim().replace(/\/$/, '');

if (!slug) {
  console.log('build-feed: FEED_SLUG не задан — общая лента не собирается.');
} else if (!/^[A-Za-z0-9_-]{16}$/.test(slug)) {
  console.error('build-feed: FEED_SLUG должен состоять из 16 символов [A-Za-z0-9_-].');
  process.exit(1);
} else if (!siteUrl) {
  console.error('build-feed: задайте SITE_URL (https://…), он нужен для ссылки на обложку.');
  process.exit(1);
} else {
  if (!existsSync('dist')) throw new Error('Сначала vite build');
  const out = `dist/feed-${slug}.xml`;
  writeFileSync(out, buildFeed(podcast, { siteUrl }));
  console.log(`build-feed: ${out}`);
}
