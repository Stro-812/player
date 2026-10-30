#!/usr/bin/env python3
"""Пересобирает данные плеера и подкаста из data/episodes.json и data/chapters-audio.json.

Запуск из корня сайта:  python3 tools/build_data.py
Создаёт: assets/js/data.js, podcast/chapters/NN.json, podcast.xml
В podcast.xml остаются метки __SITE_URL__ и mail@stro.run — их заменяют при публикации.
"""
import json
import math
import os
from datetime import datetime, timedelta, timezone
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

eps = json.load(open('data/episodes.json', encoding='utf-8'))
chs = json.load(open('data/chapters-audio.json', encoding='utf-8'))


def hms(s):
    s = int(s)
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"


chapters = {e['episode']: [] for e in eps}
def hms_to_s(v):
    h, m, sec = (int(x) for x in v.split(':'))
    return h * 3600 + m * 60 + sec


for c in chs:
    # Берём более раннюю из двух отметок: секунды и строку чч:мм:сс (в одной записи они расходились на 1 с)
    t = int(math.floor(c['start_seconds']))
    if c.get('start'):
        t = min(t, hms_to_s(c['start']))
    chapters[c['episode']].append([t, c['title']])

# Эпизод 10 начинается с продолжения главы 40: её первые слова звучат в самом конце эпизода 9.
# Когда точное начало главы в эпизоде 10 будет известно, поправьте 0 на нужную секунду.
if not chapters[10] or chapters[10][0][1] != "Письма и калоши":
    chapters[10].insert(0, [0, "Письма и калоши"])

data = {
    "episodes": [{"n": e['episode'], "title": e['title'], "url": e['url'],
                  "duration": round(e['duration_seconds'], 1)} for e in eps],
    "chapters": {str(k): v for k, v in chapters.items()},
}
with open('assets/js/data.js', 'w', encoding='utf-8') as f:
    f.write("/* Сгенерировано из data/episodes.json и data/chapters-audio.json */\n")
    f.write("window.NPB_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")

os.makedirs('podcast/chapters', exist_ok=True)
for k, v in chapters.items():
    with open(f'podcast/chapters/{k:02d}.json', 'w', encoding='utf-8') as f:
        json.dump({"version": "1.2.0", "chapters": [{"startTime": t, "title": ti} for t, ti in v]},
                  f, ensure_ascii=False, indent=1)

base = datetime(2026, 10, 30, 9, 0, tzinfo=timezone.utc)
items = []
for e in eps:
    n = e['episode']
    lines = "<br>".join(f"{hms(t)} {escape(ti)}" for t, ti in chapters[n])
    desc = f"<p>«Не про бег», эпизод {n}. Читает автор, Юрий Строфилов.</p><p>Главы:<br>{lines}</p>"
    pub = (base + timedelta(minutes=n)).strftime('%a, %d %b %Y %H:%M:%S +0000')
    items.append(f"""    <item>
      <title>Эпизод {n}. {escape(e['title'])}</title>
      <itunes:title>{escape(e['title'])}</itunes:title>
      <itunes:episode>{n}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <description><![CDATA[{desc}]]></description>
      <enclosure url="{e['url']}" length="{e['size_bytes']}" type="audio/mpeg"/>
      <guid isPermaLink="false">ne-pro-beg-ep{n:02d}</guid>
      <pubDate>{pub}</pubDate>
      <itunes:duration>{int(round(e['duration_seconds']))}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <podcast:chapters url="__SITE_URL__/podcast/chapters/{n:02d}.json" type="application/json+chapters"/>
    </item>""")

feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Не про бег</title>
    <link>__SITE_URL__/</link>
    <atom:link href="__SITE_URL__/podcast.xml" rel="self" type="application/rss+xml"/>
    <language>ru</language>
    <description>Книга Юрия Строфилова «Не про бег» в авторском чтении. 11 эпизодов, около 12 часов.</description>
    <itunes:author>Юрий Строфилов</itunes:author>
    <itunes:owner>
      <itunes:name>Юрий Строфилов</itunes:name>
      <itunes:email>mail@stro.run</itunes:email>
    </itunes:owner>
    <itunes:image href="__SITE_URL__/assets/img/podcast-cover.jpg"/>
    <itunes:category text="Sports">
      <itunes:category text="Running"/>
    </itunes:category>
    <itunes:type>serial</itunes:type>
    <itunes:explicit>false</itunes:explicit>
{chr(10).join(items)}
  </channel>
</rss>
"""
with open('podcast.xml', 'w', encoding='utf-8') as f:
    f.write(feed)
print("Готово:", {k: len(v) for k, v in chapters.items()})
