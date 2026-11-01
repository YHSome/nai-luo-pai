#!/usr/bin/env bash
set -uo pipefail
cd /c/Users/YHSome/Projects/OtherProjects/NaiWa/Tarot || exit 1

echo "== curl api.github.com (direct) =="
curl -sS -m 12 -o /dev/null -w 'code=%{http_code} time=%{time_total}\n' https://api.github.com/ || echo "curl failed"

echo "== curl github.com (direct) =="
curl -sS -m 12 -o /dev/null -w 'code=%{http_code} time=%{time_total}\n' https://github.com/ || echo "curl failed"

echo "== port 12001 =="
netstat -ano 2>/dev/null | grep -c 12001 || true

echo "== push with proxy disabled =="
git -c http.proxy= -c https.proxy= push -u origin main 2>&1 | tail -20
echo "push exit=$?"
