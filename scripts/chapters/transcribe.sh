#!/usr/bin/env bash
# Распознавание речи 11 эпизодов на Mac: whisper.cpp с Metal, модель large-v3-turbo, язык ru.
# Сам ничего не устанавливает: whisper-cli и ffmpeg ставятся заранее (brew install whisper-cpp ffmpeg),
# модель скачивается отдельно (см. README.md рядом).
#
#   scripts/chapters/transcribe.sh [рабочая папка]   # по умолчанию ~/ne-pro-beg-work
#
# MP3 только читаются: скачиваются в <папка>/mp3, для whisper делается временная копия WAV 16 кГц моно.
# Результат: <папка>/json/01.json … 11.json (сегменты с таймкодами). Уже готовые эпизоды пропускаются.
set -euo pipefail

WORK=${1:-$HOME/ne-pro-beg-work}
BASE=${AUDIO_BASE:-https://your.s10.run/audio/}
MODEL=${MODEL:-$WORK/models/ggml-large-v3-turbo.bin}
THREADS=${THREADS:-8}

command -v whisper-cli >/dev/null || { echo "Нет whisper-cli: brew install whisper-cpp"; exit 1; }
command -v ffmpeg >/dev/null || { echo "Нет ffmpeg: brew install ffmpeg"; exit 1; }
[ -f "$MODEL" ] || { echo "Нет модели $MODEL — см. scripts/chapters/README.md"; exit 1; }

mkdir -p "$WORK/mp3" "$WORK/wav" "$WORK/json"

for n in 01 02 03 04 05 06 07 08 09 10 11; do
  out="$WORK/json/$n"
  if [ -s "$out.json" ]; then echo "$n: уже распознан"; continue; fi
  mp3="$WORK/mp3/$n.mp3"
  [ -s "$mp3" ] || curl -fsSL -o "$mp3" "$BASE$n.mp3"
  wav="$WORK/wav/$n.wav"
  ffmpeg -hide_banner -loglevel error -y -i "$mp3" -ar 16000 -ac 1 -c:a pcm_s16le "$wav"
  echo "$n: распознаю ($(date +%H:%M))"
  # -oj — JSON с сегментами; -mc 64 — меньше «зацикливаний» на длинных записях.
  whisper-cli -m "$MODEL" -l ru -t "$THREADS" -mc 64 -oj -of "$out" -f "$wav" >/dev/null 2>"$WORK/json/$n.log"
  rm -f "$wav"
done
echo "Готово: $WORK/json"
