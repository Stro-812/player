# «Не про бег»: выкладка сайта-плеера

В архиве — готовый сайт, собирать ничего не нужно. Папка `site/` — статические файлы:
HTML, JS, CSS, шрифты, картинки. Серверного кода и базы данных нет.

## Куда положить

Содержимое `site/` целиком — в любую папку на `s10.run` и/или `your.s10.run`,
например `/podcast/`. Тогда плеер откроется по адресу `https://s10.run/podcast/`.

- Сайт не привязан к домену и папке: все пути внутри относительные.
- Звук плеер берёт из `/audio/` **того же домена**, где он открыт:
  на `s10.run` — из `https://s10.run/audio/`, на `your.s10.run` — из `https://your.s10.run/audio/`.
  Поэтому MP3 должны лежать в `/audio/` на каждом домене, где открывается плеер.
- В корень домена класть не нужно, если там уже другой сайт.

При обновлении папка заменяется целиком: старые файлы из `assets/` можно удалить.

## Настройки сервера

| Что | Как |
| --- | --- |
| HTTPS | Обязательно: без него не работают установка на экран и Service Worker |
| `index.html`, `sw.js`, `manifest.webmanifest` | `Cache-Control: no-cache` |
| `.webmanifest` | `Content-Type: application/manifest+json` |
| Все ответы | `X-Robots-Tag: noindex, nofollow` |

Для Apache всё это уже есть в `site/.htaccess` (нужны `AllowOverride` и `mod_headers`).
Для nginx (папка `/podcast/` для примера):

```nginx
location /podcast/ {
    add_header X-Robots-Tag "noindex, nofollow" always;

    location ~ ^/podcast/(index\.html|sw\.js)$ {
        add_header Cache-Control "no-cache";
        add_header X-Robots-Tag "noindex, nofollow" always;
    }
    location ~ \.webmanifest$ {
        types { application/manifest+json webmanifest; }
        add_header Cache-Control "no-cache";
        add_header X-Robots-Tag "noindex, nofollow" always;
    }
}
```

## MP3

Требования те же, что в инструкции по файлам: `/audio/01.mp3` … `/audio/11.mp3`,
ответ `206` на запросы с `Range`, `Content-Type: audio/mpeg`, без gzip и редиректов.

## Проверка

1. `https://<домен>/<папка>/` открывается, видна обложка «Подкаст» и кнопка «Слушать».
2. «Слушать» → «Продолжить» — звук идёт, время на экране растёт.
3. «Все эпизоды» — у всех 11 эпизодов указана длительность; любой включается.
4. Перемотка по шкале работает.
5. Проверка файлов:

```sh
for n in 01 02 03 04 05 06 07 08 09 10 11; do
  printf '%s  ' "$n.mp3"
  curl -s -o /dev/null -w '%{http_code}  %{content_type}\n' -H "Range: bytes=0-1" "https://<домен>/audio/$n.mp3"
done
```

Везде должно быть `206  audio/mpeg`.
