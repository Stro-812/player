# Выкладка на свой сервер

Сайт — статические файлы из `dist/`, MP3 — рядом или в отдельном хранилище. Сервер приложения не нужен.

## Сборка

```sh
npm ci
npm test
npm run build            # → dist/
```

Node.js 22+. Сборку можно делать на сервере или в CI и копировать только `dist/`.

## Где лежат MP3

Подробно для тех, кто кладёт файлы: [`AUDIO-FILES.md`](AUDIO-FILES.md).

Имена файлов — `01.mp3` … `11.mp3` (как в `src/data/episodes.json`, поле `file`).
Адрес папки задаётся одним из способов:

- **на том же домене** (проще всего): положить файлы в `/audio/` и собирать с
  `VITE_AUDIO_BASE=/audio/ npm run build`;
- **на другом адресе**: прописать `audioBase` в `src/data/episodes.json`, например
  `https://cdn.example.org/audio/` (со слешем в конце).

MP3 в репозиторий не кладутся. При замене файла — новое имя (`10-v2.mp3`) и правка `file` в `episodes.json`.
После загрузки файлов: `npm run probe -- <папка с MP3>` заполнит длительность и размер (нужен ffprobe).

## Требования к серверу

- HTTPS обязателен: без него не работают Service Worker и установка на домашний экран.
- Ответ `206 Partial Content` на запросы с `Range` и заголовок `Accept-Ranges: bytes` — без этого
  не работает перемотка. Проверка: `./scripts/audio.sh range https://<домен>/audio/01.mp3`.
- `Content-Type: audio/mpeg` для MP3.
- Запрет индексации: `X-Robots-Tag: noindex` на всём (в страницах и `robots.txt` он уже есть).
- `index.html` и `sw.js` не кэшировать надолго, иначе обновления не дойдут до телефонов.
- Если MP3 на другом домене: ничего про CORS настраивать не нужно, `<audio>` грузит файл без `crossorigin`.

## Пример для nginx

```nginx
server {
    listen 443 ssl http2;
    server_name podcast.example.org;
    root /var/www/ne-pro-beg/dist;

    add_header X-Robots-Tag "noindex, nofollow" always;

    location = /index.html { add_header Cache-Control "no-cache"; add_header X-Robots-Tag "noindex, nofollow" always; }
    location = /sw.js      { add_header Cache-Control "no-cache"; add_header X-Robots-Tag "noindex, nofollow" always; }
    location /assets/      { add_header Cache-Control "public, max-age=31536000, immutable"; add_header X-Robots-Tag "noindex, nofollow" always; }

    # MP3 из /var/www/ne-pro-beg/audio. Range nginx поддерживает сам.
    location /audio/ {
        alias /var/www/ne-pro-beg/audio/;
        types { audio/mpeg mp3; }
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header X-Robots-Tag "noindex, nofollow" always;
    }

    location / { try_files $uri /index.html; }
}
```

## Проверка перед рассылкой ссылки

Сайт и файлы открываются из стран, где находятся партнёры. Дальше — таблица приёмки в `docs/TZ-etap-1.md`.
