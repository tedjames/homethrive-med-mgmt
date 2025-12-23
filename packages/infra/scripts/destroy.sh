#!/bin/bash
# =============================================================================
# HomeThrive AWS Infrastructure Teardown
# =============================================================================
# Destroys all AWS resources created by the CDK stack
#
# Usage:
#   ./scripts/destroy.sh
#   pnpm destroy (from root)
#   pnpm --filter @homethrive/infra destroy

set -e

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
echo "  HomeThrive Infrastructure Teardown     "
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
warn "This will DELETE all HomeThrive AWS resources!"
warn "This action cannot be undone."
echo ""
read -p "Are you sure you want to continue? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Destruction cancelled."
  exit 0
fi

echo ""

# Unset pnpm-specific env vars to prevent npm warnings in CDK bundler
unset npm_config_allow_scripts
unset npm_config_recursive
unset npm_config_verify_deps_before_run
unset npm_config__jsr_registry

info "Destroying infrastructure..."
npx cdk destroy --force

echo ""
success "Infrastructure destroyed"
echo ""
echo "Note: Some resources may take a few minutes to fully delete."
echo "Run 'pnpm audit:aws' to verify all resources are cleaned up."
echo ""
