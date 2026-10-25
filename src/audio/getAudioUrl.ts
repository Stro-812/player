import { podcast, type Episode } from '../data/podcast';

/** Хранилище из episodes.json; при сборке его можно подменить переменной VITE_AUDIO_BASE (например, /audio/). */
const defaultBase: string = import.meta.env.VITE_AUDIO_BASE || podcast.podcast.audioBase;

/**
 * Точка замены 1. Этап 1: audioBase + file из episodes.json.
 * Этап 2: подписанная ссылка от сервера — поэтому функция асинхронная уже сейчас,
 * а плеер при ошибке загрузки вызывает её заново.
 */
export async function getAudioUrl(episode: Episode, audioBase = defaultBase): Promise<string> {
  // Относительный audioBase (/audio/) отсчитывается от адреса сайта.
  return new URL(episode.file, new URL(audioBase, location.href)).href;
}
