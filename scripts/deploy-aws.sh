#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
INFRA_DIR="$ROOT_DIR/infra"

LYX_AWS_FILE="${LYX_AWS_FILE:-$HOME/.lyx-aws}"
if [ -z "${AWS_ACCESS_KEY_ID:-}" ] && [ -f "$LYX_AWS_FILE" ]; then
  source "$LYX_AWS_FILE"
fi

REGION="${AWS_REGION:-us-west-2}"
ENV="${LYX_ENV:-production}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[lyx]${NC} $1"; }
ok()   { echo -e "${GREEN}[lyx]${NC} $1"; }
warn() { echo -e "${YELLOW}[lyx]${NC} $1"; }
err()  { echo -e "${RED}[lyx]${NC} $1"; }

banner() {
  echo ""
  echo -e "${CYAN}"
  echo "  ██╗     ██╗   ██╗██╗  ██╗"
  echo "  ██║     ╚██╗ ██╔╝╚██╗██╔╝"
  echo "  ██║      ╚████╔╝  ╚███╔╝ "
  echo "  ██║       ╚██╔╝   ██╔██╗ "
  echo "  ███████╗   ██║   ██╔╝ ██╗"
  echo "  ╚══════╝   ╚═╝   ╚═╝  ╚═╝"
  echo -e "${NC}"
  echo "  Deploy to AWS"
  echo ""
}

check_deps() {
  log "Checking dependencies..."
  local missing=0
  for cmd in aws docker jq; do
    if ! command -v "$cmd" &> /dev/null; then
      err "Missing: $cmd"
      missing=1
    fi
  done
  if [ $missing -eq 1 ]; then
    err "Install missing dependencies and try again."
    exit 1
  fi

  if ! aws sts get-caller-identity &> /dev/null; then
    err "AWS credentials not configured. Run:"
    echo "  aws configure sso  OR"
    echo "  export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_SESSION_TOKEN=..."
    exit 1
  fi

  AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
  BUCKET_NAME="lyx-bundles-${AWS_ACCOUNT_ID}-${ENV}"
  ok "AWS Account: $AWS_ACCOUNT_ID (Region: $REGION)"
}

load_or_create_secrets() {
  if [ -f "$INFRA_DIR/.secrets" ]; then
    log "Loading existing secrets..."
    source "$INFRA_DIR/.secrets"
  fi

  if [ -z "${JWT_SECRET:-}" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    ok "Generated JWT_SECRET"
  fi

  if [ -z "${MONGO_URI:-}" ]; then
    echo ""
    warn "MongoDB connection string needed."
    echo ""
    echo "  Go to https://cloud.mongodb.com (free tier):"
    echo "    1. Create an account"
    echo "    2. Create a FREE M0 cluster (us-west-2)"
    echo "    3. Create a database user"
    echo "    4. Allow access from anywhere (0.0.0.0/0)"
    echo "    5. Get the connection string"
    echo ""
    read -p "  MONGO_URI: " MONGO_URI
    if [ -z "$MONGO_URI" ]; then
      err "MONGO_URI is required."
      exit 1
    fi
    ok "MongoDB URI configured"
  fi

  cat > "$INFRA_DIR/.secrets" <<EOF
JWT_SECRET=$JWT_SECRET
MONGO_URI=$MONGO_URI
AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID
AWS_REGION=$REGION
BUCKET_NAME=$BUCKET_NAME
EOF
  chmod 600 "$INFRA_DIR/.secrets"
}

setup_iam() {
  log "Setting up IAM roles..."

  if aws iam get-role --role-name lyx-apprunner-ecr &>/dev/null 2>&1; then
    ok "ECR role exists"
  else
    aws iam create-role --role-name lyx-apprunner-ecr \
      --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"build.apprunner.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
      --output text &>/dev/null
    aws iam attach-role-policy --role-name lyx-apprunner-ecr \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
    ok "Created ECR role"
  fi
  ECR_ROLE_ARN=$(aws iam get-role --role-name lyx-apprunner-ecr --query "Role.Arn" --output text)

  if aws iam get-role --role-name lyx-apprunner-instance &>/dev/null 2>&1; then
    ok "Instance role exists"
  else
    aws iam create-role --role-name lyx-apprunner-instance \
      --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"tasks.apprunner.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
      --output text &>/dev/null
    ok "Created instance role"
  fi
  INSTANCE_ROLE_ARN=$(aws iam get-role --role-name lyx-apprunner-instance --query "Role.Arn" --output text)

  aws iam put-role-policy --role-name lyx-apprunner-instance \
    --policy-name S3BundlesAccess \
    --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:PutObject\",\"s3:GetObject\",\"s3:DeleteObject\",\"s3:ListBucket\",\"s3:HeadBucket\"],\"Resource\":[\"arn:aws:s3:::${BUCKET_NAME}\",\"arn:aws:s3:::${BUCKET_NAME}/*\"]}]}"
  ok "S3 policy attached"
}

setup_s3() {
  log "Setting up S3 bucket..."
  if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    ok "Bucket $BUCKET_NAME exists"
  else
    aws s3 mb "s3://$BUCKET_NAME" --region "$REGION"
    aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
      --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
    aws s3api put-bucket-policy --bucket "$BUCKET_NAME" \
      --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::${BUCKET_NAME}/*\"}]}"
    ok "Created S3 bucket: $BUCKET_NAME"
  fi
}

create_ecr_repos() {
  log "Setting up ECR repositories..."
  for repo in "lyx-${ENV}/admin-api" "lyx-${ENV}/admin-ui" "lyx-${ENV}/ssr"; do
    aws ecr describe-repositories --repository-names "$repo" --region "$REGION" &>/dev/null 2>&1 || \
      aws ecr create-repository --repository-name "$repo" --region "$REGION" \
        --image-scanning-configuration scanOnPush=true --output text &>/dev/null
  done
  ok "ECR ready"
}

build_and_push() {
  log "Logging into ECR..."
  aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_BASE" 2>/dev/null

  log "Building admin-api (linux/amd64)..."
  docker build --platform linux/amd64 -t "${ECR_BASE}/lyx-${ENV}/admin-api:latest" \
    -f "$ROOT_DIR/platform/admin-api/Dockerfile" \
    "$ROOT_DIR/platform/admin-api"
  docker push "${ECR_BASE}/lyx-${ENV}/admin-api:latest"
  ok "admin-api pushed"

  log "Building admin-ui (linux/amd64)..."
  docker build --platform linux/amd64 -t "${ECR_BASE}/lyx-${ENV}/admin-ui:latest" \
    -f "$ROOT_DIR/platform/admin-ui/Dockerfile.apprunner" \
    "$ROOT_DIR/platform/admin-ui"
  docker push "${ECR_BASE}/lyx-${ENV}/admin-ui:latest"
  ok "admin-ui pushed"

  log "Building ssr (linux/amd64)..."
  docker build --platform linux/amd64 -t "${ECR_BASE}/lyx-${ENV}/ssr:latest" \
    -f "$ROOT_DIR/platform/ssr/Dockerfile" \
    "$ROOT_DIR"
  docker push "${ECR_BASE}/lyx-${ENV}/ssr:latest"
  ok "ssr pushed"
}

deploy_service() {
  local NAME=$1
  local IMAGE=$2
  local PORT=$3
  local CPU=$4
  local MEMORY=$5
  local HEALTH_PATH=$6
  local ENV_VARS=$7

  local EXISTING_ARN
  EXISTING_ARN=$(aws apprunner list-services --region "$REGION" \
    --query "ServiceSummaryList[?ServiceName=='${NAME}'].ServiceArn" --output text 2>/dev/null || echo "")

  local SOURCE_CONFIG
  SOURCE_CONFIG=$(jq -n \
    --arg role "$ECR_ROLE_ARN" \
    --arg image "$IMAGE" \
    --arg port "$PORT" \
    --argjson env "$ENV_VARS" \
    '{
      AuthenticationConfiguration: { AccessRoleArn: $role },
      AutoDeploymentsEnabled: false,
      ImageRepository: {
        ImageIdentifier: $image,
        ImageRepositoryType: "ECR",
        ImageConfiguration: {
          Port: $port,
          RuntimeEnvironmentVariables: ($env | to_entries | map({Name: .key, Value: .value}))
        }
      }
    }')

  local INSTANCE_CONFIG
  INSTANCE_CONFIG=$(jq -n --arg cpu "$CPU" --arg mem "$MEMORY" --arg role "$INSTANCE_ROLE_ARN" \
    '{Cpu: $cpu, Memory: $mem, InstanceRoleArn: $role}')

  local HEALTH_CONFIG
  HEALTH_CONFIG=$(jq -n --arg path "$HEALTH_PATH" \
    '{Protocol: "TCP", Interval: 10, Timeout: 5, HealthyThreshold: 1, UnhealthyThreshold: 5}')

  if [ -n "$EXISTING_ARN" ] && [ "$EXISTING_ARN" != "None" ] && [ "$EXISTING_ARN" != "" ]; then
    log "Updating $NAME..."
    aws apprunner update-service \
      --service-arn "$EXISTING_ARN" \
      --source-configuration "$SOURCE_CONFIG" \
      --instance-configuration "$INSTANCE_CONFIG" \
      --health-check-configuration "$HEALTH_CONFIG" \
      --region "$REGION" --output text &>/dev/null
    ok "$NAME update initiated"
  else
    log "Creating $NAME..."
    aws apprunner create-service \
      --service-name "$NAME" \
      --source-configuration "$SOURCE_CONFIG" \
      --instance-configuration "$INSTANCE_CONFIG" \
      --health-check-configuration "$HEALTH_CONFIG" \
      --region "$REGION" --output text &>/dev/null
    ok "$NAME creation initiated"
  fi
}

deploy_services() {
  log "Deploying services..."
  echo ""

  deploy_service "lyx-${ENV}-admin-api" \
    "${ECR_BASE}/lyx-${ENV}/admin-api:latest" \
    "4000" "1 vCPU" "2 GB" "/api/health" \
    "{\"NODE_ENV\":\"production\",\"PORT\":\"4000\",\"MONGO_URI\":\"${MONGO_URI}\",\"MINIO_ENDPOINT\":\"s3\",\"MINIO_PORT\":\"443\",\"MINIO_ACCESS_KEY\":\"none\",\"MINIO_SECRET_KEY\":\"none\",\"MINIO_USE_SSL\":\"true\",\"MINIO_BUCKET\":\"${BUCKET_NAME}\",\"JWT_SECRET\":\"${JWT_SECRET}\",\"CORS_ORIGIN\":\"*\",\"AWS_REGION\":\"${REGION}\"}"

  log "Waiting for admin-api URL..."
  local API_URL=""
  for i in $(seq 1 30); do
    API_URL=$(aws apprunner list-services --region "$REGION" \
      --query "ServiceSummaryList[?ServiceName=='lyx-${ENV}-admin-api'].ServiceUrl" --output text 2>/dev/null || echo "")
    if [ -n "$API_URL" ] && [ "$API_URL" != "None" ] && [ "$API_URL" != "" ]; then
      break
    fi
    sleep 5
  done

  if [ -z "$API_URL" ] || [ "$API_URL" = "None" ]; then
    API_URL=$(aws apprunner list-services --region "$REGION" \
      --query "ServiceSummaryList[?starts_with(ServiceName,'lyx')&&contains(ServiceName,'api')&&!contains(ServiceName,'ui')&&!contains(ServiceName,'ssr')].ServiceUrl" --output text 2>/dev/null || echo "")
  fi

  if [ -n "$API_URL" ] && [ "$API_URL" != "None" ]; then
    deploy_service "lyx-${ENV}-admin-ui" \
      "${ECR_BASE}/lyx-${ENV}/admin-ui:latest" \
      "4001" "0.25 vCPU" "0.5 GB" "/" \
      "{\"API_URL\":\"https://${API_URL}\"}"

    deploy_service "lyx-${ENV}-ssr" \
      "${ECR_BASE}/lyx-${ENV}/ssr:latest" \
      "4002" "1 vCPU" "2 GB" "/health" \
      "{\"API_URL\":\"https://${API_URL}\",\"PORT\":\"4002\",\"S3_BUCKET\":\"${BUCKET_NAME}\",\"AWS_REGION\":\"${REGION}\"}"
  else
    warn "Could not get admin-api URL. Deploy admin-ui and SSR later."
  fi

  ok "All services deploying!"
}

wait_for_services() {
  log "Waiting for services to become active (this takes 2-5 min)..."
  echo ""
  local services=("lyx-${ENV}-admin-ui" "lyx-${ENV}-admin-api" "lyx-${ENV}-ssr")
  local all_ready=false

  for i in $(seq 1 60); do
    all_ready=true
    for svc in "${services[@]}"; do
      local status
      status=$(aws apprunner list-services --region "$REGION" \
        --query "ServiceSummaryList[?ServiceName=='${svc}'].Status" --output text 2>/dev/null || echo "UNKNOWN")
      if [ "$status" = "RUNNING" ]; then
        echo -e "  ${GREEN}✓${NC} $svc: RUNNING"
      elif [ "$status" = "CREATE_FAILED" ] || [ "$status" = "DELETE_IN_PROGRESS" ]; then
        echo -e "  ${RED}✗${NC} $svc: $status"
        all_ready=false
      else
        echo -e "  ${YELLOW}⋯${NC} $svc: $status"
        all_ready=false
      fi
    done
    if $all_ready; then
      break
    fi
    echo "  ---"
    sleep 15
  done
}

show_urls() {
  echo ""
  echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  Lyx Platform Deployed!${NC}"
  echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
  echo ""

  local services
  services=$(aws apprunner list-services --region "$REGION" \
    --query "ServiceSummaryList[?starts_with(ServiceName,'lyx-${ENV}')].[ServiceName,Status,ServiceUrl]" --output json 2>/dev/null)

  echo "$services" | jq -r '.[] | "  \(.[0]): https://\(.[2])  [\(.[1])]"'

  echo ""
  echo -e "  ${CYAN}S3 Bucket:${NC}  $BUCKET_NAME"
  echo ""
  echo "  Secrets: infra/.secrets"
  echo "  Update:  bash scripts/deploy-aws.sh update"
  echo "  Status:  bash scripts/deploy-aws.sh status"
  echo "  Destroy: bash scripts/destroy-aws.sh"
  echo ""
}

case "${1:-deploy}" in
  deploy)
    banner
    check_deps
    load_or_create_secrets
    setup_iam
    setup_s3
    create_ecr_repos
    build_and_push
    deploy_services
    wait_for_services
    show_urls
    ;;
  update)
    banner
    check_deps
    if [ -f "$INFRA_DIR/.secrets" ]; then
      source "$INFRA_DIR/.secrets"
    fi
    ECR_ROLE_ARN=$(aws iam get-role --role-name lyx-apprunner-ecr --query "Role.Arn" --output text)
    INSTANCE_ROLE_ARN=$(aws iam get-role --role-name lyx-apprunner-instance --query "Role.Arn" --output text)
    build_and_push
    deploy_services
    wait_for_services
    show_urls
    ;;
  status)
    check_deps
    echo ""
    aws apprunner list-services --region "$REGION" \
      --query "ServiceSummaryList[?starts_with(ServiceName,'lyx')].[ServiceName,Status,ServiceUrl]" --output table
    ;;
  deploy-ssr)
    check_deps
    if [ -f "$INFRA_DIR/.secrets" ]; then
      source "$INFRA_DIR/.secrets"
    fi
    ECR_ROLE_ARN=$(aws iam get-role --role-name lyx-apprunner-ecr --query "Role.Arn" --output text)
    INSTANCE_ROLE_ARN=$(aws iam get-role --role-name lyx-apprunner-instance --query "Role.Arn" --output text)
    local API_URL=$(aws apprunner list-services --region "$REGION" \
      --query "ServiceSummaryList[?ServiceName=='lyx-${ENV}-admin-api'].ServiceUrl" --output text)
    deploy_service "lyx-${ENV}-ssr" \
      "${ECR_BASE}/lyx-${ENV}/ssr:latest" \
      "4002" "1 vCPU" "2 GB" "/health" \
      "{\"API_URL\":\"https://${API_URL}\",\"PORT\":\"4002\"}"
    ;;
  *)
    echo "Usage: bash scripts/deploy-aws.sh [deploy|update|status|deploy-ssr]"
    ;;
esac
