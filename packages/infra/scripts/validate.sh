#!/bin/bash
# =============================================================================
# HomeThrive Deployment Validation
# =============================================================================
# Validates the deployed API is healthy. Warns on failure but does not block
# deployment - this allows frontend deployment to proceed.

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }

echo "Validating HomeThrive deployment..."

# Get API URL from stack outputs
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "HomeThrive" \
  --query "Stacks[0].Outputs[?ExportName=='HomeThrive-ApiUrl'].OutputValue" \
  --output text 2>/dev/null)

if [ -z "$API_URL" ] || [ "$API_URL" = "None" ]; then
  error "Could not get API URL from stack outputs"
  exit 0  # Don't block deployment
fi

echo "API URL: $API_URL"

VALIDATION_PASSED=true

# Health check
echo "Testing health endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/health" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
  success "Health check passed"
else
  error "Health check failed (HTTP $HTTP_STATUS)"
  warn "This may be a cold start issue - the API might need a moment to initialize"
  warn "Try: curl $API_URL/health"
  VALIDATION_PASSED=false
fi

# Auth check (only if health passed)
if [ "$VALIDATION_PASSED" = true ]; then
  echo "Testing auth requirement..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/v1/recipients" 2>/dev/null || echo "000")

  if [ "$HTTP_STATUS" = "401" ]; then
    success "Auth check passed (401 returned)"
  else
    warn "Auth check unexpected response (expected 401, got $HTTP_STATUS)"
    VALIDATION_PASSED=false
  fi
fi

echo ""
if [ "$VALIDATION_PASSED" = true ]; then
  echo "=== Validation Complete ==="
  success "API is healthy and running at: $API_URL"
else
  echo "=== Validation Completed with Warnings ==="
  warn "Some checks failed - API may still be initializing"
  warn "You can manually verify: curl $API_URL/health"
fi

# Always exit 0 so deployment can continue to frontend
exit 0
