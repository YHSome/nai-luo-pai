#!/usr/bin/env bash
set -uo pipefail
cd /c/Users/YHSome/Projects/OtherProjects/NaiWa/Tarot || exit 1
REPO=YHSome/nai-luo-pai

echo "== commit workflow =="
git add -A
git commit -q -m "ci: 用 GitHub Actions 部署 Pages" || echo "(nothing to commit)"
git -c http.proxy= -c https.proxy= push 2>&1 | tail -4

echo "== set build_type=workflow =="
gh api -X PUT "repos/$REPO/pages" -f build_type=workflow 2>&1 | head -c 300; echo

echo "== pages meta =="
gh api "repos/$REPO/pages" -q '.build_type, .html_url, .status' 2>&1

echo "== runs =="
sleep 8
gh run list --repo "$REPO" --limit 3 2>&1 | head -5
