#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLATFORM_DIR="$SCRIPT_DIR/../platform"

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

if [ ! -f "$PLATFORM_DIR/.env" ]; then
  cp "$PLATFORM_DIR/.env.example" "$PLATFORM_DIR/.env"
  echo "Created .env from .env.example"
fi

cd "$PLATFORM_DIR"

case "${1:-up}" in
  up)
    echo ""
    echo "  Starting Lyx Admin Platform..."
    echo ""
    docker compose up --build -d
    echo ""
    echo "  All services are starting. Waiting for health checks..."
    sleep 5

    for i in $(seq 1 30); do
      if curl -sf http://localhost/api/health > /dev/null 2>&1; then
        echo ""
        echo "  Lyx Admin Platform is ready!"
        echo ""
        echo "  Admin UI:       http://localhost"
        echo "  API:            http://localhost/api"
        echo "  MinIO Console:  http://localhost:9001"
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
    echo "Stopping Lyx Admin Platform..."
    docker compose down
    echo "Done."
    ;;
  logs)
    docker compose logs -f "${@:2}"
    ;;
  restart)
    docker compose down
    docker compose up --build -d
    echo "Restarted."
    ;;
  *)
    echo "Usage: pnpm platform [up|down|logs|restart]"
    echo ""
    echo "  up       Start the platform (default)"
    echo "  down     Stop the platform"
    echo "  logs     Tail logs (optionally pass service name)"
    echo "  restart  Restart all services"
    ;;
esac
