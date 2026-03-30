#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-$HOME/.lyx-aws}"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Lyx — AWS Credential Setup         ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
  if aws sts get-caller-identity &>/dev/null 2>&1; then
    IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null || echo "{}")
    ACCOUNT=$(echo "$IDENTITY" | grep -o '"Account": "[^"]*"' | cut -d'"' -f4)
    ARN=$(echo "$IDENTITY" | grep -o '"Arn": "[^"]*"' | cut -d'"' -f4)
    echo "  ✓ Credentials loaded from $ENV_FILE (valid)"
    echo "    Account: $ACCOUNT"
    echo "    Identity: $ARN"
    echo ""
    exit 0
  else
    echo "  ⚠ Credentials in $ENV_FILE expired."
    echo ""
  fi
fi

echo "  Enter your AWS credentials."
echo "  (From IAM Console → Security Credentials → Access Keys,"
echo "   or from SSO portal → Command line access)"
echo ""
read -p "  AWS_ACCESS_KEY_ID: " KEY_ID
read -p "  AWS_SECRET_ACCESS_KEY: " SECRET_KEY
read -p "  AWS_SESSION_TOKEN (leave empty if using IAM user keys): " SESSION_TOKEN

{
  echo "export AWS_ACCESS_KEY_ID=\"$KEY_ID\""
  echo "export AWS_SECRET_ACCESS_KEY=\"$SECRET_KEY\""
  if [ -n "$SESSION_TOKEN" ]; then
    echo "export AWS_SESSION_TOKEN=\"$SESSION_TOKEN\""
  else
    echo "unset AWS_SESSION_TOKEN 2>/dev/null || true"
  fi
} > "$ENV_FILE"

chmod 600 "$ENV_FILE"
source "$ENV_FILE"

if aws sts get-caller-identity &>/dev/null 2>&1; then
  IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null || echo "{}")
  ACCOUNT=$(echo "$IDENTITY" | grep -o '"Account": "[^"]*"' | cut -d'"' -f4)
  echo ""
  echo "  ✓ Credentials saved to $ENV_FILE"
  echo "    AWS Account: $ACCOUNT"
  echo ""
  echo "  All Lyx scripts auto-load this file."
  echo "  To load manually:  source ~/.lyx-aws"
  echo ""
  if [ -n "$SESSION_TOKEN" ]; then
    echo "  ⚠ You are using temporary (SSO) credentials."
    echo "    They will expire. Run this script again when they do."
    echo ""
  fi
else
  echo ""
  echo "  ✗ Credentials are invalid. Please check and try again."
  rm -f "$ENV_FILE"
  exit 1
fi
