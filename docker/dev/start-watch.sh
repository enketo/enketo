#!/usr/bin/env bash
set -euo pipefail

cd /srv/src/enketo

if [[ ! -d node_modules || ! -f node_modules/.yarn-integrity ]]; then
    echo "[docker-dev] Installing dependencies with yarn..."
    yarn install --frozen-lockfile
fi

# Create config.json once for local development when not provided.
if [[ ! -f packages/enketo-express/config/config.json ]]; then
    cp packages/enketo-express/config/default-config.json packages/enketo-express/config/config.json
fi

echo "[docker-dev] Starting development watchers..."
exec yarn watch
