#!/bin/bash
# =============================================================================
# HomeThrive AWS Deployment
# =============================================================================
# Deploys infrastructure to AWS and configures secrets
#
# Usage:
#   ./scripts/deploy.sh
#   pnpm deploy (from root)
#   pnpm --filter @homethrive/infra deploy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
info() { echo -e "${CYAN}→${NC} $1"; }

echo "=========================================="
echo "  HomeThrive AWS Deployment              "
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

# Ensure RDS service-linked role exists (required for RDS Proxy)
info "Checking RDS service-linked role..."
if aws iam get-role --role-name AWSServiceRoleForRDS > /dev/null 2>&1; then
  success "RDS service-linked role exists"
else
  info "Creating RDS service-linked role..."
  if aws iam create-service-linked-role --aws-service-name rds.amazonaws.com 2>&1; then
    success "RDS service-linked role created"
    # Wait a moment for role to propagate
    sleep 5
  else
    echo ""
    error "Unable to create RDS service-linked role"
    echo ""
    echo "  This role is required for RDS Proxy. You may not have permission"
    echo "  to create IAM roles. Ask your AWS administrator to run:"
    echo ""
    echo "    aws iam create-service-linked-role --aws-service-name rds.amazonaws.com"
    echo ""
    echo "  Then retry the deployment."
    echo ""
    exit 1
  fi
fi

# Check if Clerk secret exists and has value
info "Checking Clerk secret configuration..."

CLERK_SECRET_ARN=$(aws secretsmanager list-secrets \
  --query "SecretList[?Name=='homethrive/clerk'].ARN" \
  --output text 2>/dev/null || echo "")

CLERK_CONFIGURED=false
if [ -n "$CLERK_SECRET_ARN" ] && [ "$CLERK_SECRET_ARN" != "None" ]; then
  # Check if secret has a value
  CLERK_VALUE=$(aws secretsmanager get-secret-value \
    --secret-id homethrive/clerk \
    --query SecretString \
    --output text 2>/dev/null || echo "")

  if [ -n "$CLERK_VALUE" ] && [ "$CLERK_VALUE" != "{}" ] && [ "$CLERK_VALUE" != "null" ]; then
    CLERK_CONFIGURED=true
    success "Clerk secret already configured"
  fi
fi

CLERK_KEY=""
CLERK_PUB_KEY=""
if [ "$CLERK_CONFIGURED" = false ]; then
  warn "Clerk secret not configured in AWS Secrets Manager"
  echo ""
  echo "  Enter your Clerk keys for production/staging."
  echo "  (Use sk_live_/pk_live_... for production, sk_test_/pk_test_... for staging)"
  echo ""
  read -p "CLERK_SECRET_KEY: " CLERK_KEY
  read -p "CLERK_PUBLISHABLE_KEY: " CLERK_PUB_KEY
  echo ""

  if [ -z "$CLERK_KEY" ]; then
    error "Clerk secret key is required for deployment"
    exit 1
  fi

  if [ -z "$CLERK_PUB_KEY" ]; then
    error "Clerk publishable key is required for deployment"
    exit 1
  fi

  if [[ ! "$CLERK_KEY" =~ ^sk_ ]]; then
    warn "Secret key doesn't start with 'sk_' - are you sure this is correct?"
    read -p "Continue anyway? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      echo "Deployment cancelled."
      exit 1
    fi
  fi

  if [[ ! "$CLERK_PUB_KEY" =~ ^pk_ ]]; then
    warn "Publishable key doesn't start with 'pk_' - are you sure this is correct?"
    read -p "Continue anyway? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      echo "Deployment cancelled."
      exit 1
    fi
  fi
else
  # If Clerk is already configured, check if we have publishable key stored
  CLERK_PUB_KEY=$(aws secretsmanager get-secret-value \
    --secret-id homethrive/clerk \
    --query SecretString \
    --output text 2>/dev/null | grep -o '"publishableKey":"[^"]*"' | cut -d'"' -f4 || echo "")

  if [ -z "$CLERK_PUB_KEY" ]; then
    warn "Clerk publishable key not found in secret"
    echo ""
    echo "  The publishable key is needed for the API Lambda."
    echo "  (Use pk_live_... for production, pk_test_... for staging)"
    echo ""
    read -p "CLERK_PUBLISHABLE_KEY: " CLERK_PUB_KEY

    if [ -z "$CLERK_PUB_KEY" ]; then
      error "Clerk publishable key is required for deployment"
      exit 1
    fi
  else
    success "Clerk publishable key found in secret"
  fi
fi

# Export publishable key for CDK
export CLERK_PUBLISHABLE_KEY="$CLERK_PUB_KEY"

# Check if alert email is configured
info "Checking CloudWatch alert email configuration..."

ALERT_EMAIL_ARN=$(aws secretsmanager list-secrets \
  --query "SecretList[?Name=='homethrive/alerts'].ARN" \
  --output text 2>/dev/null || echo "")

CURRENT_ALERT_EMAIL=""
if [ -n "$ALERT_EMAIL_ARN" ] && [ "$ALERT_EMAIL_ARN" != "None" ]; then
  ALERT_VALUE=$(aws secretsmanager get-secret-value \
    --secret-id homethrive/alerts \
    --query SecretString \
    --output text 2>/dev/null || echo "")

  if [ -n "$ALERT_VALUE" ] && [ "$ALERT_VALUE" != "{}" ]; then
    CURRENT_ALERT_EMAIL=$(echo "$ALERT_VALUE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
  fi
fi

NEW_ALERT_EMAIL=""
if [ -n "$CURRENT_ALERT_EMAIL" ]; then
  success "Alert email configured: $CURRENT_ALERT_EMAIL"
  read -p "Change email? (y/N): " change_email
  if [ "$change_email" = "y" ] || [ "$change_email" = "Y" ]; then
    read -p "New alert email (or blank to disable): " NEW_ALERT_EMAIL
  else
    NEW_ALERT_EMAIL="$CURRENT_ALERT_EMAIL"
  fi
else
  echo ""
  echo "  CloudWatch alerts can notify you of API errors and performance issues."
  read -p "Alert email (or press Enter to skip): " NEW_ALERT_EMAIL
fi

# Validate email format if provided
if [ -n "$NEW_ALERT_EMAIL" ] && [[ ! "$NEW_ALERT_EMAIL" =~ @ ]]; then
  warn "Email doesn't contain '@' - are you sure this is correct?"
  read -p "Continue anyway? (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    NEW_ALERT_EMAIL=""
  fi
fi

# Export for CDK
export ALERT_EMAIL="$NEW_ALERT_EMAIL"

echo ""

# Deploy infrastructure
info "Deploying infrastructure (this may take a few minutes)..."

# Unset pnpm-specific env vars to prevent npm warnings in CDK bundler
unset npm_config_allow_scripts
unset npm_config_recursive
unset npm_config_verify_deps_before_run
unset npm_config__jsr_registry

npx cdk deploy --require-approval broadening

success "Infrastructure deployed"

# Run database migrations
echo ""
info "Running database migrations..."
MIGRATION_RESULT=$(aws lambda invoke \
  --function-name HomeThrive-MigrationLambda \
  --payload '{}' \
  --cli-read-timeout 300 \
  /tmp/migration-response.json 2>&1)

if [ $? -eq 0 ]; then
  MIGRATION_SUCCESS=$(cat /tmp/migration-response.json | grep -o '"success":true' || echo "")
  if [ -n "$MIGRATION_SUCCESS" ]; then
    success "Database migrations completed"
  else
    MIGRATION_ERROR=$(cat /tmp/migration-response.json | grep -o '"error":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
    warn "Database migrations failed: $MIGRATION_ERROR"
    warn "You can retry manually with: pnpm db:migrate:prod"
  fi
else
  warn "Could not invoke migration Lambda: $MIGRATION_RESULT"
  warn "You can retry manually with: pnpm db:migrate:prod"
fi
rm -f /tmp/migration-response.json

# Configure Clerk secret if needed
if [ -n "$CLERK_KEY" ]; then
  echo ""
  info "Configuring Clerk secret in AWS Secrets Manager..."
  aws secretsmanager put-secret-value \
    --secret-id homethrive/clerk \
    --secret-string "{\"secretKey\":\"$CLERK_KEY\",\"publishableKey\":\"$CLERK_PUB_KEY\"}"
  success "Clerk secret configured"
elif [ -n "$CLERK_PUB_KEY" ]; then
  # Update existing secret to add publishable key
  echo ""
  info "Updating Clerk secret with publishable key..."
  EXISTING_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id homethrive/clerk \
    --query SecretString \
    --output text 2>/dev/null || echo "{}")
  # Extract existing secret key
  EXISTING_SK=$(echo "$EXISTING_SECRET" | grep -o '"secretKey":"[^"]*"' | cut -d'"' -f4 || echo "")
  aws secretsmanager put-secret-value \
    --secret-id homethrive/clerk \
    --secret-string "{\"secretKey\":\"$EXISTING_SK\",\"publishableKey\":\"$CLERK_PUB_KEY\"}"
  success "Clerk secret updated with publishable key"
fi

# Store alert email if changed
if [ -n "$NEW_ALERT_EMAIL" ] && [ "$NEW_ALERT_EMAIL" != "$CURRENT_ALERT_EMAIL" ]; then
  echo ""
  info "Storing alert email in AWS Secrets Manager..."

  if [ -z "$ALERT_EMAIL_ARN" ] || [ "$ALERT_EMAIL_ARN" = "None" ]; then
    # Create secret if it doesn't exist
    aws secretsmanager create-secret \
      --name homethrive/alerts \
      --secret-string "{\"email\":\"$NEW_ALERT_EMAIL\"}" \
      --tags Key=Project,Value=HomeThrive > /dev/null 2>&1 || true
  fi

  aws secretsmanager put-secret-value \
    --secret-id homethrive/alerts \
    --secret-string "{\"email\":\"$NEW_ALERT_EMAIL\"}"
  success "Alert email stored"
elif [ -z "$NEW_ALERT_EMAIL" ] && [ -n "$CURRENT_ALERT_EMAIL" ]; then
  echo ""
  info "Alert email disabled"
fi

echo ""

# Run validation
info "Running validation..."
"$SCRIPT_DIR/validate.sh"

echo ""
echo "=========================================="
echo "  Deployment Complete!                   "
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Test the API endpoint (shown above)"
echo "  2. Deploy frontend: pnpm deploy:frontend"
echo ""
