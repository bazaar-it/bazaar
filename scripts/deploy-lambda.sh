#!/usr/bin/env bash
set -euo pipefail

# scripts/deploy-lambda.sh
# Deploy Remotion Lambda with robust resources.

REGION=${AWS_REGION:-us-east-1}
MEMORY=${1:-4096}
DISK=${2:-8192}
TIMEOUT=${3:-600}

echo "Region = $REGION"
echo "Memory = ${MEMORY}MB"
echo "Disk = ${DISK}MB"
echo "Timeout = ${TIMEOUT}s"

npx remotion lambda functions deploy \
  --memory "$MEMORY" \
  --disk "$DISK" \
  --timeout "$TIMEOUT" \
  --region "$REGION"
