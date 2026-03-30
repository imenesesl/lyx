#!/usr/bin/env bash
set -euo pipefail

REGION="${REGION:-${AWS_REGION:-us-west-2}}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ENV="production"

echo "::group::AWS Account"
echo "Account: $ACCOUNT_ID | Region: $REGION"
echo "::endgroup::"

ensure_ecr_repo() {
  local repo="$1"
  if ! aws ecr describe-repositories --repository-names "$repo" --region "$REGION" &>/dev/null; then
    echo "Creating ECR repo: $repo"
    aws ecr create-repository --repository-name "$repo" --region "$REGION" \
      --image-scanning-configuration scanOnPush=true --output text >/dev/null
  fi
}

ensure_iam_role() {
  local role_name="$1"
  local trust_policy="$2"
  if ! aws iam get-role --role-name "$role_name" &>/dev/null; then
    echo "Creating IAM role: $role_name"
    aws iam create-role --role-name "$role_name" \
      --assume-role-policy-document "$trust_policy" --output text >/dev/null
    sleep 2
  fi
}

attach_policy() {
  local role="$1"
  local policy="$2"
  aws iam attach-role-policy --role-name "$role" --policy-arn "$policy" 2>/dev/null || true
}

ensure_s3_bucket() {
  local bucket="$1"
  if ! aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
    echo "Creating S3 bucket: $bucket"
    if [ "$REGION" = "us-east-1" ]; then
      aws s3api create-bucket --bucket "$bucket" --region "$REGION"
    else
      aws s3api create-bucket --bucket "$bucket" --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
    fi

    echo "Configuring S3 bucket access..."
    aws s3api put-public-access-block --bucket "$bucket" \
      --public-access-block-configuration \
      "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

    aws s3api put-bucket-policy --bucket "$bucket" --policy "{
      \"Version\": \"2012-10-17\",
      \"Statement\": [{
        \"Effect\": \"Allow\",
        \"Principal\": \"*\",
        \"Action\": \"s3:GetObject\",
        \"Resource\": \"arn:aws:s3:::${bucket}/*\"
      }]
    }"
  fi
}

echo "::group::ECR Repositories"
ensure_ecr_repo "lyx-${ENV}/admin-api"
ensure_ecr_repo "lyx-${ENV}/admin-ui"
ensure_ecr_repo "lyx-${ENV}/ssr"
echo "Done"
echo "::endgroup::"

APPRUNNER_TRUST='{
  "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":["build.apprunner.amazonaws.com","tasks.apprunner.amazonaws.com"]},"Action":"sts:AssumeRole"}]
}'

echo "::group::IAM Roles"
ensure_iam_role "lyx-apprunner-ecr" "$APPRUNNER_TRUST"
attach_policy "lyx-apprunner-ecr" "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"

ensure_iam_role "lyx-apprunner-instance" "$APPRUNNER_TRUST"
attach_policy "lyx-apprunner-instance" "arn:aws:iam::aws:policy/AmazonS3FullAccess"
echo "Done"
echo "::endgroup::"

BUCKET_NAME="lyx-bundles-${ACCOUNT_ID}-${ENV}"
echo "::group::S3 Bucket"
ensure_s3_bucket "$BUCKET_NAME"
echo "Done"
echo "::endgroup::"

echo "S3_BUCKET=$BUCKET_NAME" >> "$GITHUB_OUTPUT" 2>/dev/null || true
echo "ACCOUNT_ID=$ACCOUNT_ID" >> "$GITHUB_OUTPUT" 2>/dev/null || true

echo ""
echo "Infrastructure ready."
