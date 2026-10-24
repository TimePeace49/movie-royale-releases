#!/bin/bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Install Node.js LTS from https://nodejs.org first."; read; exit; }
[ -d node_modules ] || npm install --no-audit --no-fund
(sleep 2; open http://localhost:3737) &
node src/server.js
