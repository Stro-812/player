#!/usr/bin/env bash
# Облачные сессии Claude Code: зависимости ставятся до начала работы, чтобы сразу шли тесты и сборка.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
command -v ffprobe >/dev/null || echo "Внимание: ffprobe не установлен — scripts/probe-audio.ts не запустится."
