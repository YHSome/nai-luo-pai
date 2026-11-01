#!/usr/bin/env bash
set -uo pipefail
REPO=YHSome/nai-luo-pai
BASE=https://yhsome.github.io/nai-luo-pai

for i in $(seq 1 24); do
  st=$(gh api "repos/$REPO/pages/builds/latest" -q .status 2>/dev/null || echo "?")
  root=$(curl -sS -m 15 -o /dev/null -w '%{http_code}' "$BASE/" || echo 000)
  echo "try $i: build=$st root=$root"
  if [ "$st" = "built" ] && [ "$root" = "200" ]; then break; fi
  sleep 10
done

echo "== final =="
gh api "repos/$REPO/pages/builds/latest" -q '.status' 2>&1
curl -sS -m 20 "$BASE/" | grep -o '<title>[^<]*</title>' || true
curl -sS -m 20 -o /dev/null -w 'root=%{http_code}\n' "$BASE/"
