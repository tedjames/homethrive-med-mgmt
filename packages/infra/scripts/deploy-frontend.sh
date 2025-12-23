#!/bin/bash
# =============================================================================
# HomeThrive Frontend Deployment
# =============================================================================
# Builds and deploys the frontend to S3 + CloudFront
#
# Usage:
#   ./scripts/deploy-frontend.sh
#   pnpm deploy:frontend (from root)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
WEB_DIR="$PROJECT_ROOT/apps/web"

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
echo "  HomeThrive Frontend Deployment         "
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

# Get CloudFormation outputs
info "Getting deployment configuration..."

BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name HomeThrive \
  --query 'Stacks[0].Outputs[?ExportName==`HomeThrive-FrontendBucket`].OutputValue' \
  --output text 2>/dev/null || echo "")

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name HomeThrive \
  --query 'Stacks[0].Outputs[?ExportName==`HomeThrive-DistributionId`].OutputValue' \
  --output text 2>/dev/null || echo "")

API_URL=$(aws cloudformation describe-stacks \
  --stack-name HomeThrive \
  --query 'Stacks[0].Outputs[?ExportName==`HomeThrive-ApiUrl`].OutputValue' \
  --output text 2>/dev/null || echo "")

FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name HomeThrive \
  --query 'Stacks[0].Outputs[?ExportName==`HomeThrive-FrontendUrl`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$BUCKET_NAME" ] || [ "$BUCKET_NAME" = "None" ]; then
  error "Could not find S3 bucket. Run 'pnpm deploy' first to create infrastructure."
  exit 1
fi

success "Found S3 bucket: $BUCKET_NAME"
success "Found CloudFront distribution: $DISTRIBUTION_ID"
success "API URL: $API_URL"
echo ""

# Check for Clerk publishable key
if [ -z "$VITE_CLERK_PUBLISHABLE_KEY" ]; then
  # Try to load from .env file
  if [ -f "$WEB_DIR/.env" ]; then
    export $(grep -v '^#' "$WEB_DIR/.env" | grep VITE_CLERK_PUBLISHABLE_KEY | xargs)
  fi

  if [ -z "$VITE_CLERK_PUBLISHABLE_KEY" ]; then
    error "VITE_CLERK_PUBLISHABLE_KEY is required for build"
    echo "  Set it in apps/web/.env or as environment variable"
    exit 1
  fi
fi
success "Clerk publishable key found"

# Build frontend
info "Building frontend..."
cd "$WEB_DIR"

# Set API URL for production build
export VITE_API_URL="$API_URL"

pnpm build

# Check build output
if [ ! -d "dist/client" ]; then
  error "Build output not found at dist/client"
  exit 1
fi

if [ ! -f "dist/client/_shell.html" ]; then
  warn "_shell.html not found - checking for index.html..."
  if [ -f "dist/client/index.html" ]; then
    info "Using index.html as fallback"
  else
    error "No entry point HTML found"
    exit 1
  fi
fi
success "Build complete"
echo ""

# Upload to S3
info "Uploading to S3..."

# Upload all assets except _shell.html with long cache
aws s3 sync dist/client "s3://$BUCKET_NAME" \
  --delete \
  --exclude "_shell.html" \
  --cache-control "public, max-age=31536000, immutable"

# Upload _shell.html with no cache (needs to be fresh for updates)
if [ -f "dist/client/_shell.html" ]; then
  aws s3 cp dist/client/_shell.html "s3://$BUCKET_NAME/_shell.html" \
    --cache-control "no-cache, no-store, must-revalidate"
fi

success "Files uploaded to S3"
echo ""

# Invalidate CloudFront cache
info "Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)
success "Cache invalidation started: $INVALIDATION_ID"
echo ""

echo "=========================================="
echo "  Frontend Deployment Complete!          "
echo "=========================================="
echo ""
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "Note: CloudFront cache invalidation may take a few minutes."
echo ""
