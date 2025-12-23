#!/bin/bash
# =============================================================================
# HomeThrive AWS Resource Audit
# =============================================================================
# Lists all AWS resources tagged with Project=<stack-name> to verify
# what exists or confirm everything has been cleaned up.
#
# By default, checks for both:
#   - Project=homethrive-test-ted (current default)
#   - Project=HomeThrive (legacy tag)
#
# Override the primary tag with STACK_NAME env var:
#   STACK_NAME=my-custom-stack pnpm audit:aws
#
# Usage:
#   ./scripts/audit.sh
#   pnpm audit:aws (from root)

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

# Configurable stack name (matches bin/app.ts default)
STACK_NAME="${STACK_NAME:-homethrive-test-ted}"
LEGACY_TAG="HomeThrive"

echo "=========================================="
echo "  HomeThrive AWS Resource Audit          "
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

# Check CloudFormation stack (primary)
info "Checking CloudFormation stack '$STACK_NAME'..."
STACK_STATUS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" = "NOT_FOUND" ]; then
  echo -e "  Stack '$STACK_NAME': ${YELLOW}Not found${NC}"
else
  echo -e "  Stack '$STACK_NAME': ${CYAN}$STACK_STATUS${NC}"
fi

# Also check legacy stack name
if [ "$STACK_NAME" != "$LEGACY_TAG" ]; then
  LEGACY_STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$LEGACY_TAG" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

  if [ "$LEGACY_STACK_STATUS" != "NOT_FOUND" ]; then
    echo -e "  Stack '$LEGACY_TAG' (legacy): ${CYAN}$LEGACY_STACK_STATUS${NC}"
  fi
fi
echo ""

# Function to check resources for a given tag
check_resources_for_tag() {
  local tag_value="$1"

  RESOURCES=$(aws resourcegroupstaggingapi get-resources \
    --tag-filters Key=Project,Values="$tag_value" \
    --query 'ResourceTagMappingList[*].ResourceARN' \
    --output json 2>/dev/null | grep -o '"arn:[^"]*"' | tr -d '"' || echo "")

  if [ -n "$RESOURCES" ]; then
    RESOURCE_COUNT=$(echo "$RESOURCES" | wc -l | tr -d ' ')
    warn "Found $RESOURCE_COUNT resource(s):"
    echo ""

    echo "$RESOURCES" | while read -r arn; do
      if [ -n "$arn" ]; then
        echo "  • $arn"
      fi
    done
    return 1
  else
    success "No resources found"
  fi
  return 0
}

# Check for resources with primary tag
echo "------------------------------------------"
echo "  Tag: Project=$STACK_NAME (current)"
echo "------------------------------------------"
PRIMARY_FOUND=0
if ! check_resources_for_tag "$STACK_NAME"; then
  PRIMARY_FOUND=1
fi
echo ""

# Check for resources with legacy tag (if different)
LEGACY_FOUND=0
if [ "$STACK_NAME" != "$LEGACY_TAG" ]; then
  echo "------------------------------------------"
  echo "  Tag: Project=$LEGACY_TAG (legacy)"
  echo "------------------------------------------"
  if ! check_resources_for_tag "$LEGACY_TAG"; then
    LEGACY_FOUND=1
  fi
  echo ""
fi

# Summary
if [ "$PRIMARY_FOUND" -eq 0 ] && [ "$LEGACY_FOUND" -eq 0 ]; then
  success "No resources found with Project tags"
  echo ""
  echo "=========================================="
  echo "  All HomeThrive resources cleaned up!   "
  echo "=========================================="
else
  echo "=========================================="
  echo "  Resources still exist in AWS           "
  echo "=========================================="
  echo ""
  echo "To delete all resources, run: pnpm destroy"
  echo ""
  echo "If the stack was already deleted, these may be orphaned resources."
  echo "You may need to delete them manually via AWS Console."
fi

echo ""

# Also check for any secrets that might remain
info "Checking for HomeThrive secrets..."
SECRETS=$(aws secretsmanager list-secrets \
  --query "SecretList[?starts_with(Name, 'homethrive/')].Name" \
  --output text 2>/dev/null || echo "")

if [ -z "$SECRETS" ] || [ "$SECRETS" = "None" ]; then
  success "No HomeThrive secrets found"
else
  warn "Found secrets:"
  for secret in $SECRETS; do
    echo "  • $secret"
  done
  echo ""
  echo "Note: Secrets may be scheduled for deletion (7-30 day retention)."
  echo "To force immediate deletion:"
  echo "  aws secretsmanager delete-secret --secret-id <name> --force-delete-without-recovery"
fi

echo ""
