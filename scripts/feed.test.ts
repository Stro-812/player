import { describe, expect, it } from 'vitest';
import { buildFeed, formatDuration } from './feed';
import { podcast } from '../src/data/podcast';

const xml = buildFeed(podcast, { siteUrl: 'https://example.org' });

describe('buildFeed', () => {
  it('канал закрыт от каталогов и идёт по порядку', () => {
    expect(xml).toContain('<itunes:block>yes</itunes:block>');
    expect(xml).toContain('<itunes:type>serial</itunes:type>');
    expect(xml).toContain('<language>ru</language>');
    expect(xml).toContain('<itunes:image href="https://example.org/cover-3000.jpg"/>');
  });

  it('11 выпусков с постоянными guid и номерами по возрастанию', () => {
    const nums = [...xml.matchAll(/<itunes:episode>(\d+)<\/itunes:episode>/g)].map((m) => Number(m[1]));
    expect(nums).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(xml).toContain('<guid isPermaLink="false">ne-pro-beg-ep-10</guid>');
  });

  it('даты публикации растут вместе с номером', () => {
    const dates = [...xml.matchAll(/<pubDate>(.+?)<\/pubDate>/g)].map((m) => Date.parse(m[1]!));
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('enclosure со ссылкой из episodes.json, типом и размером', () => {
    const url = new URL('10.mp3', new URL(podcast.podcast.audioBase, 'https://example.org/')).href;
    expect(xml).toMatch(new RegExp(`<enclosure url="${url.replace(/[.?]/g, '\\$&')}" type="audio/mpeg" length="\\d+"/>`));
  });

  it('экранирует спецсимволы', () => {
    const data = { ...podcast, episodes: [{ ...podcast.episodes[0]!, title: 'A & <B>' }] };
    expect(buildFeed(data, { siteUrl: 'https://x' })).toContain('<title>A &amp; &lt;B&gt;</title>');
  });

  it('formatDuration', () => {
    expect(formatDuration(4440)).toBe('01:14:00');
    expect(formatDuration(59.6)).toBe('00:01:00');
  });
});
