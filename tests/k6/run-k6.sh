#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIOS_DIR="${SCRIPT_DIR}/scenarios"

BASE_URL="${BASE_URL:-http://localhost:4002}"
ADMIN_URL="${ADMIN_URL:-http://localhost:4001}"
SHELL_URL="${SHELL_URL:-http://localhost:4002}"

usage() {
  echo "Usage: $0 <scenario> [k6-extra-args...]"
  echo ""
  echo "Available scenarios:"
  echo "  api-load          API endpoint load test (50 VUs)"
  echo "  ssr-load          SSR page rendering load test (20 VUs)"
  echo "  concurrent-users  Concurrent user journey simulation"
  echo "  all               Run all scenarios sequentially"
  echo ""
  echo "Environment variables:"
  echo "  BASE_URL   Shell URL (default: http://localhost:4002)"
  echo "  ADMIN_URL  Admin API URL (default: http://localhost:4001)"
  echo "  SHELL_URL  Shell URL (default: http://localhost:4002)"
  echo ""
  echo "Examples:"
  echo "  $0 api-load"
  echo "  $0 ssr-load --env BASE_URL=https://staging.example.com"
  echo "  BASE_URL=https://staging.example.com $0 all"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

SCENARIO="$1"
shift

if ! command -v k6 &> /dev/null; then
  echo "Error: k6 is not installed. Install it from https://k6.io/docs/get-started/installation/"
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RESULTS_DIR="${SCRIPT_DIR}/results"
mkdir -p "${RESULTS_DIR}"

run_scenario() {
  local name="$1"
  local file="${SCENARIOS_DIR}/${name}.js"

  if [ ! -f "$file" ]; then
    echo "Error: scenario file not found: $file"
    exit 1
  fi

  local summary="${RESULTS_DIR}/${name}_${TIMESTAMP}.html"

  echo "============================================"
  echo "Running k6 scenario: ${name}"
  echo "  BASE_URL:  ${BASE_URL}"
  echo "  ADMIN_URL: ${ADMIN_URL}"
  echo "  SHELL_URL: ${SHELL_URL}"
  echo "  Report:    ${summary}"
  echo "============================================"

  k6 run \
    --env BASE_URL="${BASE_URL}" \
    --env ADMIN_URL="${ADMIN_URL}" \
    --env SHELL_URL="${SHELL_URL}" \
    --summary-export="${RESULTS_DIR}/${name}_${TIMESTAMP}.json" \
    --out "json=${RESULTS_DIR}/${name}_${TIMESTAMP}_raw.json" \
    "$@" \
    "${file}"

  echo ""
  echo "Scenario ${name} complete. Results: ${RESULTS_DIR}/"
  echo ""
}

case "${SCENARIO}" in
  api-load|ssr-load|concurrent-users)
    run_scenario "${SCENARIO}" "$@"
    ;;
  all)
    for s in api-load ssr-load concurrent-users; do
      run_scenario "$s" "$@"
    done
    echo "All scenarios complete."
    ;;
  *)
    echo "Error: unknown scenario '${SCENARIO}'"
    echo ""
    usage
    ;;
esac
