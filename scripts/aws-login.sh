#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-$HOME/.lyx-aws}"

if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
  if aws sts get-caller-identity &>/dev/null 2>&1; then
    echo "  AWS credentials loaded from $ENV_FILE (still valid)"
    exit 0
  else
    echo "  Credentials in $ENV_FILE expired. Enter new ones:"
  fi
fi

echo ""
echo "  Paste your AWS credentials (from SSO portal):"
echo ""
read -p "  AWS_ACCESS_KEY_ID: " KEY_ID
read -p "  AWS_SECRET_ACCESS_KEY: " SECRET_KEY
read -p "  AWS_SESSION_TOKEN: " SESSION_TOKEN

cat > "$ENV_FILE" <<EOF
export AWS_ACCESS_KEY_ID="$KEY_ID"
export AWS_SECRET_ACCESS_KEY="$SECRET_KEY"
export AWS_SESSION_TOKEN="$SESSION_TOKEN"
EOF
chmod 600 "$ENV_FILE"

source "$ENV_FILE"

if aws sts get-caller-identity &>/dev/null 2>&1; then
  echo ""
  echo "  Credentials saved to $ENV_FILE"
  echo ""
  echo "  Next time, just run:"
  echo "    source ~/.lyx-aws"
  echo ""
  echo "  Or before any deploy command:"
  echo "    source ~/.lyx-aws && bash scripts/deploy-aws.sh update"
  echo ""
else
  echo "  ERROR: Credentials are invalid."
  rm -f "$ENV_FILE"
  exit 1
fi
