#!/usr/bin/env bash
set -uo pipefail
REPO=YHSome/nai-luo-pai

echo "== create pages =="
gh api -X POST "repos/$REPO/pages" -f "source[branch]=main" -f "source[path]=/" 2>&1 | head -20
echo "exit=$?"

echo "== pages info =="
gh api "repos/$REPO/pages" -q '.html_url + " | status=" + (.status // "?") + " | build=" + ((.build_type) // "?")' 2>&1 | head -5

echo "== latest build =="
gh api "repos/$REPO/pages/builds/latest" -q '.status + " " + (.commit // "")' 2>&1 | head -5
