#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-west-2}"
ENV="${LYX_ENV:-production}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/../infra"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}"
echo "  WARNING: This will destroy ALL Lyx infrastructure on AWS!"
echo "  Region: $REGION | Environment: $ENV"
echo -e "${NC}"
read -p "  Type 'yes' to confirm: " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="lyx-bundles-${AWS_ACCOUNT_ID}-${ENV}"

echo ""
echo "Deleting App Runner services..."
for svc_arn in $(aws apprunner list-services --region "$REGION" \
  --query "ServiceSummaryList[?starts_with(ServiceName,'lyx-${ENV}')].ServiceArn" --output text 2>/dev/null); do
  echo "  Deleting $svc_arn..."
  aws apprunner delete-service --service-arn "$svc_arn" --region "$REGION" --output text &>/dev/null || true
done

echo "Emptying S3 bucket..."
aws s3 rm "s3://$BUCKET_NAME" --recursive --region "$REGION" 2>/dev/null || true
aws s3 rb "s3://$BUCKET_NAME" --region "$REGION" 2>/dev/null || true

echo "Cleaning ECR images..."
for repo in "lyx-${ENV}/admin-api" "lyx-${ENV}/admin-ui" "lyx-${ENV}/ssr"; do
  images=$(aws ecr list-images --repository-name "$repo" --region "$REGION" --query "imageIds" --output json 2>/dev/null || echo "[]")
  if [ "$images" != "[]" ] && [ -n "$images" ]; then
    aws ecr batch-delete-image --repository-name "$repo" --region "$REGION" --image-ids "$images" &>/dev/null || true
  fi
  aws ecr delete-repository --repository-name "$repo" --region "$REGION" --force &>/dev/null || true
done

echo "Deleting IAM roles..."
for role in lyx-apprunner-ecr lyx-apprunner-instance lyx-apprunner-access; do
  policies=$(aws iam list-attached-role-policies --role-name "$role" --query "AttachedPolicies[*].PolicyArn" --output text 2>/dev/null || echo "")
  for pol in $policies; do
    aws iam detach-role-policy --role-name "$role" --policy-arn "$pol" 2>/dev/null || true
  done
  inline=$(aws iam list-role-policies --role-name "$role" --query "PolicyNames" --output text 2>/dev/null || echo "")
  for pol in $inline; do
    aws iam delete-role-policy --role-name "$role" --policy-name "$pol" 2>/dev/null || true
  done
  aws iam delete-role --role-name "$role" 2>/dev/null || true
done

echo ""
echo -e "${GREEN}All Lyx AWS resources destroyed.${NC}"

if [ -f "$INFRA_DIR/.secrets" ]; then
  rm "$INFRA_DIR/.secrets"
  echo "Removed local secrets file."
fi
