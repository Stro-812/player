# Не про бег

Сайт-плеер подкаста «Не про бег»: 11 эпизодов, аудиоверсия книги Юрия Строфилова.
Этап 1 — открытый статический сайт для партнёров. ТЗ: [`docs/TZ-etap-1.md`](docs/TZ-etap-1.md).

## Начало работы

Нужен Node.js 22+ и, для работы с аудио, ffmpeg/ffprobe.

```sh
npm install
npm run dev        # http://localhost:5173
npm test
npm run build      # dist/
```

## Структура

| Путь | Что |
| --- | --- |
| `src/data/episodes.json` | Все эпизоды и `audioBase` хранилища |
| `src/audio/getAudioUrl.ts` | Точка замены 1: ссылка на MP3 |
| `src/state/progressStore.ts` | Точка замены 2: позиции прослушивания |
| `src/audio/player.ts` | Единственный `<audio>`, Media Session, повторы при сбое сети |
| `src/env/inAppBrowser.ts` | Признаки Telegram, Instagram, Facebook |
| `src/ui/*` | Экраны: тизер, плеер, эпизоды, «откройте в браузере» |
| `src/sw.ts` | Service Worker: только оболочка, MP3 не трогает |
| `scripts/probe-audio.ts` | Длительность и размер MP3 → `episodes.json` |
| `scripts/build-feed.ts` | Общая RSS-лента (если задан `FEED_SLUG`) |
| `scripts/audio.sh` | Проверка громкости, битрейта, Range; пробное перекодирование |

## Аудио

```sh
./scripts/audio.sh info 10.mp3          # битрейт и формат
./scripts/audio.sh loudness 10.mp3      # LUFS и истинный пик
./scripts/audio.sh sample 10.mp3 600 60 # фрагмент «как есть» и 64 кбит/с моно для сравнения на слух
npm run probe -- ./audio                # заполнить durationSec и bytes
./scripts/audio.sh range https://<хранилище>/audio/10.mp3  # должно быть 206 и Accept-Ranges: bytes
```

MP3 в git не попадают (`.gitignore`).

## Общая лента

Скопировать `.env.example` в `.env`, задать `FEED_SLUG` (16 символов) и `SITE_URL`.
`npm run build` положит `dist/feed-<FEED_SLUG>.xml`. На сайте ссылка не публикуется.

## Раздача со своего компьютера

Для проверки на телефонах до выбора хостинга: сайт и MP3 раздаются с компьютера через временный туннель https.

```sh
brew install cloudflared                       # один раз (Windows: winget install Cloudflare.cloudflared)
npm run share -- "$HOME/Desktop/не про бег"    # файлы в папке названы 01.mp3, 02.mp3 …
```

Команда печатает адрес `https://….trycloudflare.com`. Пока она работает, компьютер не должен засыпать.
Адрес меняется при каждом запуске, и позиции прослушивания на телефоне начинаются заново.

## Просмотр артефактом на claude.ai

Как песочницы прошлых проектов: `npm run artifact` собирает `dist-artifact/`, папка публикуется
инструментом Artifact в Claude Code тем же URL: https://claude.ai/artifact/Xs46L4ohU2qxQfjH3DUtwa

Это витрина экранов, а не замена хостингу: в артефакте не работают Service Worker, установка на
домашний экран, звук из внешнего хранилища и hash-адрес в строке браузера (страница всегда
открывается с тизера). Проверка фонового воспроизведения у партнёров — только на своём домене.

## Выкладка

Хостинг и хранилище ещё не выбраны. Когда будут выбраны, `npm run deploy` соберёт сайт и выложит `dist/`;
ключи — только в переменных окружения. Требования к хостингу: HTTPS, `X-Robots-Tag: noindex`;
к хранилищу: ответ 206 на Range, `Cache-Control: public, max-age=31536000, immutable`.

## Что осталось решить

См. «Открытые вопросы» в ТЗ: названия и длительности эпизодов, финальные обложка и иконки, домен,
хостинг и хранилище, нужна ли общая лента, пережимать ли MP3.
