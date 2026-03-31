#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLATFORM_DIR="$SCRIPT_DIR/../platform"
LYX_AWS_FILE="${LYX_AWS_FILE:-$HOME/.lyx-aws}"

if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed. Install it from https://docker.com"
  exit 1
fi

if ! docker info &> /dev/null 2>&1; then
  echo "Starting Docker..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open -a Docker
  fi
  for i in $(seq 1 30); do
    docker info &> /dev/null 2>&1 && break
    sleep 2
  done
  if ! docker info &> /dev/null 2>&1; then
    echo "Error: Could not start Docker. Please start Docker Desktop manually."
    exit 1
  fi
fi

load_env() {
  if [ -f "$LYX_AWS_FILE" ]; then
    source "$LYX_AWS_FILE"
    echo "  Loaded AWS credentials from ~/.lyx-aws"
  fi

  if [ ! -f "$PLATFORM_DIR/.env" ]; then
    cp "$PLATFORM_DIR/.env.example" "$PLATFORM_DIR/.env"
    echo "  Created .env from .env.example — edit platform/.env with your values"
  fi

  if [ -z "${MONGO_URI:-}" ]; then
    if grep -q "^MONGO_URI=" "$PLATFORM_DIR/.env" 2>/dev/null; then
      MONGO_URI=$(grep "^MONGO_URI=" "$PLATFORM_DIR/.env" | cut -d= -f2-)
    fi
  fi

  if [ -z "${MONGO_URI:-}" ] || [ "$MONGO_URI" = "mongodb+srv://user:password@cluster.mongodb.net/lyx" ]; then
    echo ""
    echo "  ⚠  MONGO_URI is not configured."
    echo "     Edit platform/.env or run: lyx aws login"
    echo "     Get your connection string from https://cloud.mongodb.com"
    echo ""
    exit 1
  fi

  if [ -z "${AWS_ACCESS_KEY_ID:-}" ]; then
    echo ""
    echo "  ⚠  AWS credentials not found."
    echo "     Run: lyx aws login"
    echo ""
    exit 1
  fi
}

cd "$PLATFORM_DIR"

case "${1:-up}" in
  up)
    echo ""
    echo "  Starting Lyx Platform..."
    echo ""
    load_env
    docker compose up --build -d
    echo ""
    echo "  Waiting for services..."
    sleep 5

    for i in $(seq 1 30); do
      if curl -sf http://localhost/api/health > /dev/null 2>&1; then
        echo ""
        echo "  Lyx Platform is ready!"
        echo ""
        echo "  Admin UI:  http://localhost/admin/"
        echo "  Apps:      http://localhost/{accountId}/{slug}/"
        echo "  API:       http://localhost/api/"
        echo ""
        exit 0
      fi
      sleep 2
    done
    echo ""
    echo "  Services started but API health check is still pending."
    echo "  Run 'docker compose -f platform/docker-compose.yml logs -f' to check."
    echo ""
    ;;
  down)
    echo "Stopping Lyx Platform..."
    docker compose down
    echo "Done."
    ;;
  logs)
    docker compose logs -f "${@:2}"
    ;;
  restart)
    load_env
    docker compose down
    docker compose up --build -d
    echo "Restarted."
    ;;
  *)
    echo "Usage: pnpm platform [up|down|logs|restart]"
    echo ""
    echo "  up       Start the platform (requires lyx aws login + MONGO_URI)"
    echo "  down     Stop the platform"
    echo "  logs     Tail logs (optionally pass service name)"
    echo "  restart  Restart all services"
    ;;
esac
