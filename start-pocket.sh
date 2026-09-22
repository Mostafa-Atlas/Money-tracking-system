#!/usr/bin/env sh
# Start Pocket on macOS / Linux. On Windows use start-pocket.cmd or `node server.mjs`.
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 24 or newer is required. See README.md." >&2
  exit 1
fi
node server.mjs
