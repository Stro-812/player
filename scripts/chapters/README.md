# Таймкоды глав

Начало каждой из 45 глав книги в 11 эпизодах: распознавание речи (whisper.cpp, Metal)
и нечёткое сравнение с названиями, первыми и последними словами глав.

Справочник глав `ne-pro-beg-chapters.json` в репозиторий не кладётся (цитаты из книги,
репозиторий публичный) — его передают отдельно.

## Подготовка на Mac (один раз)

```sh
brew install whisper-cpp ffmpeg
mkdir -p ~/ne-pro-beg-work/models
curl -L -o ~/ne-pro-beg-work/models/ggml-large-v3-turbo.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
python3 -m venv scripts/chapters/.venv
scripts/chapters/.venv/bin/pip install -r scripts/chapters/requirements.txt
```

## Запуск

```sh
scripts/chapters/transcribe.sh                      # → ~/ne-pro-beg-work/json/01.json … 11.json
scripts/chapters/.venv/bin/python scripts/chapters/match_chapters.py \
  --chapters ~/ne-pro-beg-work/ne-pro-beg-chapters.json \
  --transcripts ~/ne-pro-beg-work/json \
  --out ~/ne-pro-beg-work/chapters-audio.json
```

MP3 скачиваются в `~/ne-pro-beg-work/mp3` и не изменяются. Распознавание уже готовых эпизодов
при повторном запуске пропускается.

## Результат

`chapters-audio.json` — по главе на запись:
`episode`, `chapter`, `title`, `start_seconds`, `start` (чч:мм:сс), `confidence` (0–1),
плюс `title_read` (название прочитано вслух) и `match` — оценки по первым словам, названию
и последним словам предыдущей главы. Уверенность ниже 0,75 — проверить на слух.

Как ищется начало: окно расшифровки с начала каждого сегмента сравнивается с первыми словами
главы (`partial_ratio`), прочитанное перед ними название сдвигает начало на себя. Из
кандидатов выбирается последовательность со строго возрастающими номерами глав и наибольшей
суммой оценок. Уверенность — меньшая из оценок начала и последних слов предыдущей главы перед ним.
