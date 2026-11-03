#!/usr/bin/env bash
# Пакет сайта книги для Netlify: готовая папка site/ + инструкция для Claude Code партнёра.
#   scripts/pack-netlify.sh [адрес сайта]      # по умолчанию https://book.stro.coffee
# Результат: package/ne-pro-beg-netlify.zip
# Делает с book-site/ то же, что выкладка на GitHub Pages (.github/workflows/pages.yml),
# только с другим адресом сайта.
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_URL=${1:-https://book.stro.coffee}
OUT=package/ne-pro-beg-netlify
rm -rf "$OUT" "$OUT.zip" && mkdir -p "$OUT"

cp -r book-site "$OUT/site"
rm -rf "$OUT/site/README.md" "$OUT/site/tools"
grep -rl '__SITE_URL__' "$OUT/site" | xargs sed -i "s#__SITE_URL__#${SITE_URL}#g"
! grep -rn '__SITE_URL__\|__OWNER_EMAIL__' "$OUT/site"
for f in css/site.css js/site.js js/data.js; do
  v=$(sha256sum "$OUT/site/assets/$f" | cut -c1-10)
  grep -rlF "assets/$f\"" "$OUT/site" --include=*.html | xargs sed -i "s#assets/$f\"#assets/$f?v=$v\"#g"
done
# Netlify: ничего не собирать, отдавать папку как есть.
printf '[build]\n  publish = "."\n  command = ""\n' > "$OUT/site/netlify.toml"

cp deploy/NETLIFY-CLAUDE.md "$OUT/ИНСТРУКЦИЯ-ДЛЯ-CLAUDE.md"
sed -i "s#__SITE_URL__#${SITE_URL}#g" "$OUT/ИНСТРУКЦИЯ-ДЛЯ-CLAUDE.md"
(cd package && zip -qr ne-pro-beg-netlify.zip ne-pro-beg-netlify)
echo "package/ne-pro-beg-netlify.zip  ($(find "$OUT/site" -type f | wc -l) файлов сайта)"
