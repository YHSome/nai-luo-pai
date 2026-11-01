#!/usr/bin/env bash
set -uo pipefail
URL=https://yhsome.github.io/nai-luo-pai/
for i in $(seq 1 20); do
  code=$(curl -sS -m 15 -o /dev/null -w '%{http_code}' "$URL" || echo 000)
  echo "try $i: $code"
  if [ "$code" = "200" ]; then break; fi
  sleep 10
done

echo "== index =="
curl -sS -m 20 "$URL" | head -c 400
echo
echo "== title =="
curl -sS -m 20 "$URL" | grep -o '<title>[^<]*</title>'
echo "== assets =="
curl -sS -m 20 -o /dev/null -w 'style=%{http_code}\n' "${URL}css/style.css"
curl -sS -m 20 -o /dev/null -w 'app=%{http_code}\n' "${URL}js/app.js"
curl -sS -m 20 -o /dev/null -w 'card=%{http_code} size=%{size_download}\n' "${URL}assets/cards_nai/%E6%84%9A%E8%80%85.webp"
