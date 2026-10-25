#!/usr/bin/env bash
# Команды для проверки и подготовки MP3. Ничего не запускается само:
# сначала владелец смотрит команды, потом вызывает нужную.
#   ./scripts/audio.sh info    <file.mp3>   — битрейт, CBR/VBR, частота, каналы
#   ./scripts/audio.sh loudness <file.mp3>  — интегральная громкость (LUFS) и истинный пик
#   ./scripts/audio.sh sample  <file.mp3> [start] [sec] — фрагмент: как есть и 64 кбит/с моно −16 LUFS
#   ./scripts/audio.sh encode  <in.mp3> <out.mp3> — перекодировать в целевой формат (с потерями!)
#   ./scripts/audio.sh range   <url>        — проверить, что хранилище отвечает 206 на Range
set -euo pipefail
cmd=${1:-}; shift || true

case "$cmd" in
  info)
    ffprobe -v error -select_streams a:0 \
      -show_entries stream=codec_name,bit_rate,sample_rate,channels:format=duration,bit_rate \
      -of default=nw=1 "$1"
    ;;
  loudness)
    ffmpeg -hide_banner -nostats -i "$1" -af loudnorm=I=-16:TP=-1:LRA=11:print_format=summary -f null - 2>&1 \
      | sed -n '/Input Integrated/,/Target Offset/p'
    ;;
  sample)
    start=${2:-600}; len=${3:-60}; base=$(basename "$1" .mp3)
    ffmpeg -hide_banner -y -ss "$start" -t "$len" -i "$1" -c copy "${base}-sample-orig.mp3"
    ffmpeg -hide_banner -y -ss "$start" -t "$len" -i "$1" \
      -af loudnorm=I=-16:TP=-1:LRA=11 -ac 1 -ar 44100 -c:a libmp3lame -b:a 64k \
      "${base}-sample-64k-mono.mp3"
    ;;
  encode)
    # Двухпроходный loudnorm точнее, но для речи хватает одного прохода.
    ffmpeg -hide_banner -y -i "$1" \
      -af loudnorm=I=-16:TP=-1:LRA=11 -ac 1 -ar 44100 -c:a libmp3lame -b:a 64k \
      -id3v2_version 3 "$2"
    ;;
  range)
    curl -sI -H "Range: bytes=0-1" "$1" | grep -iE '^(HTTP|accept-ranges|content-length|content-range|content-type|cache-control|x-robots-tag)'
    ;;
  *)
    sed -n '2,9p' "$0"; exit 1
    ;;
esac
