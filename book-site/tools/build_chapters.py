#!/usr/bin/env python3
"""Собирает 45 страниц глав из files/ne-pro-beg.epub: glava/01/index.html … glava/45/index.html.

Запуск из корня сайта:  python3 tools/build_chapters.py
Берёт только главы OEBPS/Text/1.xhtml … 45.xhtml; обложку, титул, оглавление и служебные
страницы издательства пропускает. Кнопка «Слушать эту главу» — по data/chapters-audio.json.
Метка __SITE_URL__ остаётся в canonical, og и sitemap.xml — её заменяют при публикации.
"""
import html
import json
import os
import re
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

EPUB = 'files/ne-pro-beg.epub'
TOTAL = 45
# Главы о марафонах «Шести звёзд» — выделяются в оглавлении на главной.
RACES = {4, 10, 23, 33, 38, 43}

audio = {c['chapter']: c for c in json.load(open('data/chapters-audio.json', encoding='utf-8'))}


def listen_target(n):
    """Эпизод и секунда начала главы для кнопки «Слушать эту главу»."""
    if n == 40:
        # Первые слова главы 40 звучат в конце эпизода 9, основная часть — в эпизоде 10.
        return 10, 0
    c = audio[n]
    return c['episode'], int(c['start_seconds'])


LISTEN_NOTE = {42: 'Запись начинается с середины главы'}


def clean_inline(s):
    """Внутренности абзаца: служебные якоря убраны, осмысленные ссылки — как есть."""
    s = re.sub(r'<a id="[^"]*"\s*/?>(?:</a>)?', '', s)
    s = re.sub(r'<a href="(https?://[^"]+)">', r'<a href="\1" rel="noopener">', s)
    s = s.replace('http://kremlin.ru/', 'https://kremlin.ru/')
    return s.strip()


def plain(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).replace(' ', ' ').strip()


def convert(body):
    """Разметка EPUB → разметка страницы. Возвращает (заголовок, html тела, текст для description)."""
    title = None
    out = []
    verse = []
    text_for_desc = []

    def flush_verse():
        if verse:
            out.append('<div class="chapter__verse">\n' + '\n'.join(verse) + '\n</div>')
            verse.clear()

    for m in re.finditer(r'<(h1|h2|p|ul)\b([^>]*)>(.*?)</\1>', body, re.S):
        tag, attrs, inner = m.group(1), m.group(2), m.group(3)
        cls = (re.search(r'class="([^"]*)"', attrs) or [None, ''])[1].split()
        gap = ' class="gap"' if 't' in cls else ''
        if tag == 'h1':
            title = html.unescape(re.search(r'title="([^"]*)"', attrs).group(1))
            continue
        if 'Stih' in cls:
            verse.append(f'<p{gap}>{clean_inline(inner)}</p>')
            continue
        flush_verse()
        inner = clean_inline(inner)
        if tag == 'h2':
            out.append(f'<h2 class="chapter__split">{inner}</h2>')
        elif tag == 'ul':
            items = re.findall(r'<li>(.*?)</li>', inner, re.S)
            out.append('<ul>\n' + '\n'.join(f'<li>{clean_inline(i)}</li>' for i in items) + '\n</ul>')
        elif '_case' in cls:
            out.append(f'<p class="chapter__case{" gap" if gap else ""}">{inner}</p>')
        elif 'Vrezka' in cls:
            out.append(f'<blockquote{gap}><p>{inner}</p></blockquote>')
        elif cls and cls[0] in ('Body_text', 'Body_text_First'):
            out.append(f'<p{gap}>{inner}</p>')
            text_for_desc.append(plain(inner))
        else:
            raise SystemExit(f'Неизвестная разметка: <{tag} {attrs}>')
    flush_verse()
    return title, '\n'.join(out), ' '.join(text_for_desc)


def description(text, limit=150):
    if len(text) <= limit:
        return text
    cut = text.rfind(' ', 0, limit)
    return text[:cut].rstrip(' ,.;:—') + '…'


def hms(t):
    return f'{t // 3600:02d}:{t % 3600 // 60:02d}:{t % 60:02d}'


def esc(s):
    return html.escape(s, quote=True)


def page(n, title, body, desc, titles):
    nn = f'{n:02d}'
    ep, t = listen_target(n)
    note = LISTEN_NOTE.get(n)
    full = f'Глава {n}. {title} — «Не про бег», Юрий Строфилов'
    prev_link = (f'<a class="chapter__prev" href="../{n - 1:02d}/"><span>Предыдущая глава</span>{esc(titles[n - 1])}</a>'
                 if n > 1 else '<span></span>')
    next_link = (f'<a class="chapter__next" href="../{n + 1:02d}/"><span>Следующая глава</span>{esc(titles[n + 1])}</a>'
                 if n < TOTAL else '<span></span>')
    note_html = f'\n        <p class="chapter__note">{note}</p>' if note else ''
    return f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(full)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="theme-color" content="#E43941">
<link rel="canonical" href="__SITE_URL__/glava/{nn}/">
<meta property="og:type" content="article">
<meta property="og:title" content="{esc(full)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="__SITE_URL__/glava/{nn}/">
<meta property="og:image" content="__SITE_URL__/assets/img/og.jpg">
<link rel="icon" href="../../assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../../assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Extra+Condensed:wght@700;800;900&amp;family=Golos+Text:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;display=swap">
<link rel="stylesheet" href="../../assets/css/site.css">
</head>
<body>
  <header class="on-coral">
    <div class="wrap"><nav class="nav" aria-label="Сайт книги"><a class="wordmark" href="../../">Не про бег</a><div class="nav__links"><a href="../../#six">Шесть звёзд</a><a href="../../#toc">Оглавление</a><a href="../../#read">Скачать книгу</a></div></nav></div>
  </header>
  <main class="reader chapter">
    <p class="chapter__no">Глава {n} из {TOTAL}</p>
    <h1 class="display">{esc(title)}</h1>
    <p class="reader__by">Юрий Строфилов, «Не про бег»</p>
    <div class="chapter__listen">
      <a class="btn btn--ink" href="../../#ep={ep}&amp;t={t}">Слушать эту главу</a>
      <span class="chapter__when">эпизод {ep}, {hms(t)}</span>{note_html}
    </div>
    <div class="reader__body">
{body}
    </div>
    <nav class="reader__end chapter__nav" aria-label="Главы">
      <div class="chapter__pn">
        {prev_link}
        {next_link}
      </div>
      <div class="btns">
        <a class="btn btn--line" href="../../#toc">Оглавление</a>
        <a class="btn btn--ink" href="../../files/ne-pro-beg.epub" download>Скачать EPUB</a>
        <a class="btn btn--line" href="../../files/ne-pro-beg.pdf" download>Скачать PDF</a>
      </div>
    </nav>
  </main>
</body>
</html>
'''


def main():
    z = zipfile.ZipFile(EPUB)
    chapters = {}
    for n in range(1, TOTAL + 1):
        x = z.read(f'OEBPS/Text/{n}.xhtml').decode('utf-8')
        body = re.search(r'<body[^>]*>(.*)</body>', x, re.S).group(1)
        chapters[n] = convert(body)
    titles = {n: c[0] for n, c in chapters.items()}
    for n, (title, body, text) in chapters.items():
        d = f'glava/{n:02d}'
        os.makedirs(d, exist_ok=True)
        open(f'{d}/index.html', 'w', encoding='utf-8').write(page(n, title, body, description(text), titles))

    # Оглавление для главной: между метками в index.html.
    race = ' class="is-race"'
    items = '\n'.join(
        f'        <li{race if n in RACES else ""}><a href="glava/{n:02d}/">'
        f'<span class="toc__no">{n}</span>{esc(titles[n])}</a></li>'
        for n in range(1, TOTAL + 1))
    idx = open('index.html', encoding='utf-8').read()
    a, b = '<!-- toc:start -->', '<!-- toc:end -->'
    if a in idx:
        i, j = idx.index(a) + len(a), idx.index(b)
        idx = idx[:i] + '\n      <ol class="toc__list">\n' + items + '\n      </ol>\n      ' + idx[j:]
        open('index.html', 'w', encoding='utf-8').write(idx)

    urls = ['__SITE_URL__/'] + [f'__SITE_URL__/glava/{n:02d}/' for n in range(1, TOTAL + 1)]
    open('sitemap.xml', 'w', encoding='utf-8').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + ''.join(f'  <url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n')
    print(f'Готово: {TOTAL} глав, оглавление, sitemap.xml')


if __name__ == '__main__':
    main()
