#!/usr/bin/env bash
# ─── Local test runner ────────────────────────────────────────────────────────
# Usage:
#   ./tests/run-tests.sh              # runs all phases
#   ./tests/run-tests.sh phase1       # runs only phase1.test.ts
#   ./tests/run-tests.sh phase2       # runs only phase2.test.ts
#
# The script starts the Next.js dev server if it isn't already running,
# waits for it to be ready, then runs vitest. Exit code mirrors vitest.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://localhost:3000}"
PHASE="${1:-}"
SERVER_PID=""

# ─── Helpers ──────────────────────────────────────────────────────────────────

wait_for_server() {
  echo "⏳ Waiting for server at $BASE_URL ..."
  for i in $(seq 1 30); do
    if curl -sf "$BASE_URL" -o /dev/null 2>/dev/null; then
      echo "✅ Server is ready."
      return 0
    fi
    sleep 2
  done
  echo "❌ Server did not start within 60 s. Aborting."
  exit 1
}

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    echo "🛑 Stopping dev server (PID $SERVER_PID)"
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ─── Start server if not already running ──────────────────────────────────────

if ! curl -sf "$BASE_URL" -o /dev/null 2>/dev/null; then
  echo "🚀 Starting Next.js dev server..."
  npm run dev &> /tmp/saarthi-dev.log &
  SERVER_PID=$!
  wait_for_server
else
  echo "✅ Server already running at $BASE_URL"
fi

# ─── Run tests ────────────────────────────────────────────────────────────────

if [ "$PHASE" = "phase1" ]; then
  echo "🧪 Running Phase 1 tests..."
  npx vitest run tests/phase1.test.ts
elif [ "$PHASE" = "phase2" ]; then
  echo "🧪 Running Phase 2 tests..."
  npx vitest run tests/phase2.test.ts
elif [ "$PHASE" = "phase3" ]; then
  echo "🧪 Running Phase 3 tests..."
  npx vitest run tests/phase3.test.ts
else
  echo "🧪 Running all tests..."
  npx vitest run
fi
