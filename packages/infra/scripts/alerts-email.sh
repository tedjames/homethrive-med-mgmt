#!/bin/bash
# =============================================================================
# CloudWatch Alert Email Configuration
# =============================================================================
# Update the email address for CloudWatch alarm notifications.
#
# Usage:
#   ./scripts/alerts-email.sh
#   pnpm alerts:email (from root)

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
echo "  CloudWatch Alert Email Configuration   "
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

echo ""

# Get current email
CURRENT_EMAIL=""
ALERT_VALUE=$(aws secretsmanager get-secret-value \
  --secret-id homethrive/alerts \
  --query SecretString \
  --output text 2>/dev/null || echo "")

if [ -n "$ALERT_VALUE" ] && [ "$ALERT_VALUE" != "{}" ]; then
  CURRENT_EMAIL=$(echo "$ALERT_VALUE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
fi

if [ -n "$CURRENT_EMAIL" ]; then
  echo "Current alert email: $CURRENT_EMAIL"
else
  echo "No alert email configured"
fi
echo ""

read -p "New email (or blank to disable): " NEW_EMAIL

if [ -n "$NEW_EMAIL" ] && [[ ! "$NEW_EMAIL" =~ @ ]]; then
  error "Invalid email format"
  exit 1
fi

# Create or update secret
if [ -n "$NEW_EMAIL" ]; then
  info "Updating alert email..."

  # Check if secret exists
  if aws secretsmanager describe-secret --secret-id homethrive/alerts > /dev/null 2>&1; then
    aws secretsmanager put-secret-value \
      --secret-id homethrive/alerts \
      --secret-string "{\"email\":\"$NEW_EMAIL\"}"
  else
    aws secretsmanager create-secret \
      --name homethrive/alerts \
      --secret-string "{\"email\":\"$NEW_EMAIL\"}" \
      --tags Key=Project,Value=HomeThrive
  fi

  success "Alert email updated to: $NEW_EMAIL"
  echo ""
  warn "Note: Run 'pnpm deploy:backend' to apply the change to CloudWatch"
else
  if [ -n "$CURRENT_EMAIL" ]; then
    info "Disabling alert email..."
    aws secretsmanager put-secret-value \
      --secret-id homethrive/alerts \
      --secret-string "{}"
    success "Alert email disabled"
    echo ""
    warn "Note: Run 'pnpm deploy:backend' to remove the SNS subscription"
  else
    info "No changes made"
  fi
fi
