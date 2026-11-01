#!/usr/bin/env bash
set -uo pipefail
REPO=YHSome/nai-luo-pai
BASE=https://yhsome.github.io/nai-luo-pai

echo "== pages meta =="
gh api "repos/$REPO/pages" -q '.status, .html_url, .build_type, .source.branch' 2>&1 | head -6

echo "== builds =="
gh api "repos/$REPO/pages/builds" -q '.[] | "\(.status) \(.commit) \(.created_at)"' 2>&1 | head -6

echo "== fetch /index.html =="
curl -sS -m 20 -o /dev/null -w 'code=%{http_code} size=%{size_download}\n' "$BASE/index.html"
echo "== fetch / (again) =="
curl -sS -m 20 -o /dev/null -w 'code=%{http_code} size=%{size_download}\n' "$BASE/"
echo "== fetch /README.md =="
curl -sS -m 20 -o /dev/null -w 'code=%{http_code} size=%{size_download}\n' "$BASE/README.md"
