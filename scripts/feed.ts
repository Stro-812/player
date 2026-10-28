import type { PodcastData } from '../src/data/podcast';

/** Общая RSS-лента для подкаст-приложений (по желанию, этап 1). Во втором этапе удаляется. */
export interface FeedOptions {
  /** Адрес сайта с https, без слеша в конце. */
  siteUrl: string;
  /** Дата публикации первого выпуска; остальные идут по возрастанию номера, через сутки. */
  firstPubDate?: Date;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function formatDuration(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (x: number): string => String(x).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

export function buildFeed(data: PodcastData, opts: FeedOptions): string {
  const { podcast: p } = data;
  const first = opts.firstPubDate ?? new Date('2026-11-01T06:00:00Z');
  const cover = `${opts.siteUrl}${p.artworkFeed}`;
  const items = [...data.episodes]
    .sort((a, b) => a.n - b.n)
    .map((ep, i) => {
      // audioBase может быть относительным (/audio/) — тогда от адреса сайта.
      const url = new URL(ep.file, new URL(p.audioBase, `${opts.siteUrl}/`)).href;
      const date = new Date(first.getTime() + i * 86_400_000).toUTCString();
      return `    <item>
      <title>${esc(ep.title)}</title>
      <itunes:title>${esc(ep.title)}</itunes:title>
      <itunes:episode>${ep.n}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <guid isPermaLink="false">ne-pro-beg-ep-${ep.n}</guid>
      <pubDate>${date}</pubDate>
      <enclosure url="${esc(url)}" type="audio/mpeg" length="${ep.bytes}"/>
      <itunes:duration>${formatDuration(ep.durationSec)}</itunes:duration>
      <itunes:explicit>true</itunes:explicit>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${esc(p.title)}</title>
    <link>${esc(opts.siteUrl)}/</link>
    <language>${p.language}</language>
    <description>Аудиоверсия книги «${esc(p.title)}». Читает ${esc(p.author)}.</description>
    <itunes:author>${esc(p.author)}</itunes:author>
    <itunes:image href="${esc(cover)}"/>
    <itunes:type>serial</itunes:type>
    <itunes:block>yes</itunes:block>
    <itunes:explicit>true</itunes:explicit>
${items}
  </channel>
</rss>
`;
}
