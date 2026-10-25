import { describe, expect, it } from 'vitest';
import { getAudioUrl } from './getAudioUrl';
import { podcast } from '../data/podcast';

const ep = podcast.episodes.find((e) => e.n === 10)!;

describe('getAudioUrl', () => {
  it('склеивает audioBase и имя файла', async () => {
    expect(await getAudioUrl(ep, 'https://cdn.example/audio/')).toBe('https://cdn.example/audio/10.mp3');
  });

  it('по умолчанию берёт audioBase из episodes.json', async () => {
    expect(await getAudioUrl(ep)).toBe(new URL('10.mp3', podcast.podcast.audioBase).href);
  });

  it('относительный audioBase отсчитывается от адреса сайта', async () => {
    expect(await getAudioUrl(ep, '/audio/')).toBe(`${location.origin}/audio/10.mp3`);
  });

  it('новое имя файла после замены даёт новую ссылку', async () => {
    expect(await getAudioUrl({ ...ep, file: '10-v2.mp3' }, 'https://cdn.example/audio/')).toBe(
      'https://cdn.example/audio/10-v2.mp3',
    );
  });
});
