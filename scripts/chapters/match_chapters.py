#!/usr/bin/env python3
"""Таймкоды начала глав «Не про бег» по расшифровке whisper.cpp.

    python match_chapters.py --chapters ne-pro-beg-chapters.json --transcripts <папка с 01.json…11.json> \
        --out chapters-audio.json

Для каждой главы ищется место в расшифровке, где звучит её название и/или первые слова
(нечёткое сравнение, rapidfuzz). Из кандидатов выбирается последовательность со строго
возрастающими номерами глав и наибольшей суммарной оценкой. Граница проверяется последними
словами предыдущей главы перед найденным началом.
"""
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path

from rapidfuzz import fuzz

FIRST_CHARS = 120   # сколько первых слов главы сравнивать
LAST_CHARS = 90     # сколько последних слов предыдущей главы
CANDIDATES = 12     # кандидатов на главу для выбора последовательности
LOW = 0.75          # ниже — низкая уверенность


def norm(s: str) -> str:
    s = s.lower().replace('ё', 'е')
    s = re.sub(r'[^0-9a-zа-я]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def head(s: str, n: int) -> str:
    """Первые n символов, не разрывая слово."""
    if len(s) <= n:
        return s
    cut = s.rfind(' ', 0, n)
    return s[: cut if cut > 0 else n]


def tail(s: str, n: int) -> str:
    if len(s) <= n:
        return s
    cut = s.find(' ', len(s) - n)
    return s[cut + 1 if cut >= 0 else len(s) - n:]


@dataclass
class Seg:
    start: float
    end: float
    text: str     # нормализованный
    pos: int      # смещение начала сегмента в тексте эпизода


@dataclass
class Episode:
    n: int
    segs: list[Seg]
    text: str     # нормализованный текст эпизода целиком, сегменты через пробел


def load_episode(n: int, path: Path) -> Episode:
    data = json.loads(path.read_text(encoding='utf-8'))
    segs: list[Seg] = []
    parts: list[str] = []
    pos = 0
    for item in data['transcription']:
        t = norm(item['text'])
        if not t:
            continue
        segs.append(Seg(item['offsets']['from'] / 1000, item['offsets']['to'] / 1000, t, pos))
        parts.append(t)
        pos += len(t) + 1
    return Episode(n, segs, ' '.join(parts))


def time_at(ep: Episode, char: int) -> float:
    """Время символа char в тексте эпизода: внутри сегмента — пропорционально длине."""
    seg = ep.segs[0]
    for s in ep.segs:
        if s.pos > char:
            break
        seg = s
    frac = min(max((char - seg.pos) / max(len(seg.text), 1), 0.0), 1.0)
    return seg.start + frac * (seg.end - seg.start)


@dataclass
class Cand:
    ep: int        # индекс эпизода в списке
    char: int      # начало главы в тексте эпизода
    score: float   # 0–100
    title_read: bool
    first_score: float
    title_score: float

    @property
    def key(self) -> tuple[int, int]:
        return (self.ep, self.char)


def find_candidates(eps: list[Episode], title: str, first: str) -> list[Cand]:
    t = norm(title)
    f = head(norm(first), FIRST_CHARS)
    span = len(t) + len(f) + 40
    found: list[Cand] = []
    for ei, ep in enumerate(eps):
        for seg in ep.segs:
            # Окно с начала сегмента: глава может начаться и в середине сегмента.
            win = ep.text[seg.pos: seg.pos + len(seg.text) + span]
            al = fuzz.partial_ratio_alignment(f, win)
            # Первые слова должны начинаться в этом сегменте (или сразу за названием в нём).
            if al.dest_start > len(seg.text) + len(t) + 5:
                continue
            first_score = al.score
            start = seg.pos + al.dest_start
            # Название, прочитанное вслух прямо перед первыми словами.
            title_score = 0.0
            title_read = False
            if t:
                before = ep.text[max(seg.pos, start - len(t) - 25): start]
                if before:
                    ta = fuzz.partial_ratio_alignment(t, before)
                    title_score = ta.score
                    if ta.score >= 85:
                        title_read = True
                        start = max(seg.pos, start - len(t) - 25) + ta.dest_start
            score = first_score if not title_read else min(100.0, max(first_score, (first_score + title_score) / 2 + 5))
            if score >= 50:
                found.append(Cand(ei, start, score, title_read, first_score, title_score))
    # Лучшие, не ближе 200 символов друг к другу.
    found.sort(key=lambda c: -c.score)
    best: list[Cand] = []
    for c in found:
        if all(c.ep != b.ep or abs(c.char - b.char) > 200 for b in best):
            best.append(c)
        if len(best) >= CANDIDATES:
            break
    return best


def choose(cands: list[list[Cand]]) -> list[Cand | None]:
    """Строго возрастающие позиции с максимальной суммой оценок (пропуск главы — штраф)."""
    MISS = -40.0
    # dp[k] — список (сумма, позиция, путь) для главы k; держим всех кандидатов + вариант «пропуск».
    states: list[tuple[float, tuple[int, int], list[Cand | None]]] = [(0.0, (-1, -1), [])]
    for options in cands:
        nxt = []
        for c in options:
            prev = [s for s in states if s[1] < c.key]
            if prev:
                total, _, path = max(prev, key=lambda s: s[0])
                nxt.append((total + c.score, c.key, path + [c]))
        total, pos, path = max(states, key=lambda s: s[0])
        nxt.append((total + MISS, pos, path + [None]))
        # Оставляем недоминируемые состояния: для каждой позиции лучшую сумму.
        nxt.sort(key=lambda s: (s[1], -s[0]))
        pruned, best_so_far = [], float('-inf')
        for s in nxt:
            if s[0] > best_so_far:
                pruned.append(s)
                best_so_far = s[0]
        states = pruned
    return max(states, key=lambda s: s[0])[2]


def check_boundary(eps: list[Episode], c: Cand, last_words: str) -> float:
    """Последние слова предыдущей главы перед началом: в этом эпизоде или в конце предыдущего."""
    lw = tail(norm(last_words), LAST_CHARS)
    ep = eps[c.ep]
    before = ep.text[max(0, c.char - len(lw) - 60): c.char]
    score = fuzz.partial_ratio(lw, before) if before else 0.0
    # Глава в самом начале эпизода: перед ней только объявление эпизода.
    if c.char < 200 and c.ep > 0:
        prev = eps[c.ep - 1].text
        score = max(score, fuzz.partial_ratio(lw, prev[-(len(lw) + 80):]))
    return score


def hms(sec: float) -> str:
    s = int(sec)
    return f'{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--chapters', required=True)
    ap.add_argument('--transcripts', required=True)
    ap.add_argument('--out', default='chapters-audio.json')
    args = ap.parse_args()

    ref = json.loads(Path(args.chapters).read_text(encoding='utf-8'))['chapters']
    eps = [load_episode(int(p.stem), p) for p in sorted(Path(args.transcripts).glob('[0-9][0-9].json'))]
    if not eps:
        raise SystemExit('Нет расшифровок 01.json … 11.json')

    cands = [find_candidates(eps, ch['title'], ch['first_words']) for ch in ref]
    chosen = choose(cands)

    result = []
    for i, (ch, c) in enumerate(zip(ref, chosen)):
        if c is None:
            result.append({'episode': None, 'chapter': ch['chapter'], 'title': ch['title'],
                           'start_seconds': None, 'start': None, 'confidence': 0.0,
                           'note': 'начало не найдено'})
            continue
        boundary = check_boundary(eps, c, ref[i - 1]['last_words']) if i > 0 else None
        conf = min(c.score, boundary) if boundary is not None else c.score
        t = time_at(eps[c.ep], c.char)
        item = {
            'episode': eps[c.ep].n,
            'chapter': ch['chapter'],
            'title': ch['title'],
            'start_seconds': round(t, 1),
            'start': hms(t),
            'confidence': round(conf / 100, 2),
            'title_read': c.title_read,
            'match': {'first_words': round(c.first_score), 'title': round(c.title_score),
                      'prev_last_words': None if boundary is None else round(boundary)},
        }
        result.append(item)

    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    for r in result:
        flag = '  ⚠ низкая уверенность' if r['confidence'] < LOW else ''
        ep = '—' if r['episode'] is None else f"{r['episode']:>2}"
        print(f"{ep}  {r['start'] or '—':>8}  {r['chapter']:>2}. {r['title']}  ({r['confidence']:.2f}){flag}")


if __name__ == '__main__':
    main()
