#!/bin/bash
# =============================================================================
# HomeThrive Database Migration
# =============================================================================
# Manually run database migrations via Lambda
#
# Usage:
#   ./scripts/migrate.sh
#   pnpm db:migrate:prod (from root)

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
info() { echo -e "${CYAN}→${NC} $1"; }

echo "=========================================="
echo "  HomeThrive Database Migration          "
echo "=========================================="
echo ""

# Check AWS credentials
info "Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  error "AWS credentials not configured"
  echo "  Run 'aws configure' to set up your credentials"
  exit 1
fi
success "AWS credentials valid"

# Invoke migration Lambda
info "Running migrations via Lambda..."
echo ""

RESPONSE=$(aws lambda invoke \
  --function-name HomeThrive-MigrationLambda \
  --payload '{}' \
  --cli-read-timeout 300 \
  /tmp/migration-response.json 2>&1)

if [ $? -ne 0 ]; then
  error "Failed to invoke Lambda: $RESPONSE"
  echo ""
  echo "  Make sure the HomeThrive stack has been deployed."
  echo "  Run 'pnpm deploy:backend' first if needed."
  exit 1
fi

# Display and parse response
echo "Response:"
cat /tmp/migration-response.json
echo ""
echo ""

SUCCESS=$(cat /tmp/migration-response.json | grep -o '"success":true' || echo "")
if [ -n "$SUCCESS" ]; then
  success "Migrations completed successfully"
else
  ERROR_MSG=$(cat /tmp/migration-response.json | grep -o '"error":"[^"]*"' | cut -d'"' -f4 || echo "See response above")
  error "Migrations failed: $ERROR_MSG"
  rm -f /tmp/migration-response.json
  exit 1
fi

rm -f /tmp/migration-response.json
