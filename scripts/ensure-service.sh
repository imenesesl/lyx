#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="$1"
IMAGE="$2"
PORT="$3"
ENV_VARS="$4"
REGION="${REGION:-${AWS_REGION:-us-west-2}}"
NEEDS_INSTANCE_ROLE="${5:-false}"

ECR_ROLE_ARN=$(aws iam get-role --role-name lyx-apprunner-ecr --query "Role.Arn" --output text)

SOURCE_CONFIG="{\"AuthenticationConfiguration\":{\"AccessRoleArn\":\"$ECR_ROLE_ARN\"},\"AutoDeploymentsEnabled\":false,\"ImageRepository\":{\"ImageIdentifier\":\"$IMAGE\",\"ImageRepositoryType\":\"ECR\",\"ImageConfiguration\":{\"Port\":\"$PORT\",\"RuntimeEnvironmentVariables\":$ENV_VARS}}}"

INSTANCE_CONFIG="{}"
if [ "$NEEDS_INSTANCE_ROLE" = "true" ]; then
  INSTANCE_ROLE_ARN=$(aws iam get-role --role-name lyx-apprunner-instance --query "Role.Arn" --output text)
  INSTANCE_CONFIG="{\"InstanceRoleArn\":\"$INSTANCE_ROLE_ARN\"}"
fi

EXISTING_ARN=$(aws apprunner list-services --region "$REGION" \
  --query "ServiceSummaryList[?ServiceName=='$SERVICE_NAME'].ServiceArn" \
  --output text 2>/dev/null || echo "")

if [ -z "$EXISTING_ARN" ] || [ "$EXISTING_ARN" = "None" ]; then
  echo "Creating new service: $SERVICE_NAME"
  aws apprunner create-service \
    --service-name "$SERVICE_NAME" \
    --source-configuration "$SOURCE_CONFIG" \
    --instance-configuration "$INSTANCE_CONFIG" \
    --health-check-configuration "Protocol=TCP,Interval=10,Timeout=5,HealthyThreshold=1,UnhealthyThreshold=5" \
    --region "$REGION" \
    --query "Service.ServiceUrl" --output text
else
  echo "Updating service: $SERVICE_NAME"
  aws apprunner update-service \
    --service-arn "$EXISTING_ARN" \
    --source-configuration "$SOURCE_CONFIG" \
    --instance-configuration "$INSTANCE_CONFIG" \
    --region "$REGION" \
    --query "Service.Status" --output text
fi
