import data from './episodes.json';

export interface Chapter {
  title: string;
  startSec: number;
}

export interface Episode {
  n: number;
  title: string;
  file: string;
  durationSec: number;
  bytes: number;
  chapters: Chapter[];
  /** Резерв для этапа 2: открыт без подписки. В этапе 1 не используется. */
  free: boolean;
}

export interface PodcastInfo {
  title: string;
  author: string;
  language: string;
  artwork: string;
  artworkFeed: string;
  audioBase: string;
}

export interface PodcastData {
  podcast: PodcastInfo;
  episodes: Episode[];
}

/** Единственный источник эпизодов. В разметке ничего не хардкодится. */
export const podcast: PodcastData = data;

export function episodeByNumber(n: number): Episode | undefined {
  return podcast.episodes.find((e) => e.n === n);
}
