#!/bin/bash
# =============================================================================
# HomeThrive Development Setup
# =============================================================================
# Sets up the local development environment by:
# - Creating .env files for API and Web apps
# - Prompting for Clerk keys
# - Optionally creating a Clerk test user
# - Installing dependencies
#
# Usage:
#   ./scripts/setup.sh
#   pnpm dev:setup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

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
echo "  HomeThrive Development Setup           "
echo "=========================================="
echo ""

cd "$ROOT_DIR"

# Check Node.js version (require 22+)
info "Checking Node.js version..."
NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)

if [ -z "$NODE_VERSION" ]; then
  error "Node.js is not installed"
  echo "  Please install Node.js 22 or later: https://nodejs.org/"
  exit 1
fi

if [ "$NODE_VERSION" -lt 22 ]; then
  error "Node.js version $NODE_VERSION is not supported"
  echo "  This project requires Node.js 22 or later (you have v$NODE_VERSION)"
  echo "  Please upgrade: https://nodejs.org/"
  exit 1
fi
success "Node.js v$NODE_VERSION detected"

# Check pnpm
info "Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
  error "pnpm is not installed"
  echo "  Please install pnpm: npm install -g pnpm"
  exit 1
fi
PNPM_VERSION=$(pnpm -v | cut -d. -f1)
success "pnpm v$(pnpm -v) detected"

echo ""

# Check if .env files already exist
API_ENV="apps/api/.env"
WEB_ENV="apps/web/.env"

if [ -f "$API_ENV" ] && [ -f "$WEB_ENV" ]; then
  warn "Environment files already exist."
  read -p "Overwrite? (y/N): " overwrite
  if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
    echo "Setup cancelled."
    exit 0
  fi
fi

# Check templates exist
if [ ! -f "apps/api/.env.example" ]; then
  error "apps/api/.env.example not found!"
  exit 1
fi

if [ ! -f "apps/web/.env.example" ]; then
  error "apps/web/.env.example not found!"
  exit 1
fi

# Copy templates
info "Creating environment files from templates..."
cp apps/api/.env.example "$API_ENV"
cp apps/web/.env.example "$WEB_ENV"
success "Created .env files"

# Prompt for Clerk keys
echo ""
echo "Enter your Clerk keys (get these from your team lead):"
echo ""
read -p "CLERK_SECRET_KEY (sk_test_...): " clerk_secret
read -p "CLERK_PUBLISHABLE_KEY (pk_test_...): " clerk_pub

# Validate input
if [[ ! "$clerk_secret" =~ ^sk_ ]]; then
  warn "CLERK_SECRET_KEY should start with 'sk_'"
fi
if [[ ! "$clerk_pub" =~ ^pk_ ]]; then
  warn "CLERK_PUBLISHABLE_KEY should start with 'pk_'"
fi

# Update API .env
info "Configuring API environment..."
sed -i '' "s|CLERK_SECRET_KEY=.*|CLERK_SECRET_KEY=$clerk_secret|" "$API_ENV"
sed -i '' "s|CLERK_PUBLISHABLE_KEY=.*|CLERK_PUBLISHABLE_KEY=$clerk_pub|" "$API_ENV"
success "API .env configured"

# Update Web .env
info "Configuring Web environment..."
sed -i '' "s|VITE_CLERK_PUBLISHABLE_KEY=.*|VITE_CLERK_PUBLISHABLE_KEY=$clerk_pub|" "$WEB_ENV"
sed -i '' "s|CLERK_SECRET_KEY=.*|CLERK_SECRET_KEY=$clerk_secret|" "$WEB_ENV"
success "Web .env configured"

echo ""

# --------------------
# Create Clerk test user
# --------------------
echo "Create a test user for local development?"
read -p "Enter your email for Clerk testing (or press Enter to skip): " test_email

if [ -z "$test_email" ]; then
  info "Skipping test user creation."
  echo "  Make sure to log in to the Clerk admin portal and enter the"
  echo "  development environment to create your test account if it does not already exist."
  echo ""
else
  info "Checking if user exists in Clerk..."

  # Check if user already exists
  existing_user=$(curl -s -X GET "https://api.clerk.com/v1/users?email_address=$test_email" \
    -H "Authorization: Bearer $clerk_secret" \
    -H "Content-Type: application/json")

  user_count=$(echo "$existing_user" | grep -o '"id"' | wc -l | tr -d ' ')

  if [ "$user_count" -gt "0" ]; then
    success "User $test_email already exists in Clerk"
  else
    info "Creating test user in Clerk..."

    # Prompt for password
    read -s -p "Choose a password for your test account: " test_password
    echo ""

    if [ -z "$test_password" ]; then
      test_password="#devtest123"
      warn "No password entered, using default: $test_password"
    fi

    create_response=$(curl -s -X POST "https://api.clerk.com/v1/users" \
      -H "Authorization: Bearer $clerk_secret" \
      -H "Content-Type: application/json" \
      -d "{
        \"email_address\": [\"$test_email\"],
        \"password\": \"$test_password\",
        \"skip_password_checks\": true
      }")

    # Check if creation was successful
    if echo "$create_response" | grep -q '"id"'; then
      success "Test user created!"
      echo ""
      echo "  Email: $test_email"
      echo "  Password: (the one you just entered)"
      echo ""
    else
      error "Failed to create test user"
      echo "  Response: $create_response"
      echo ""
      warn "You can create a user manually at https://dashboard.clerk.com"
    fi
  fi
fi

echo ""

# Install dependencies
info "Installing dependencies..."
pnpm install
success "Dependencies installed"

# Build packages (core and db must be compiled for other packages to use them)
info "Building packages..."
pnpm build
success "Packages built"

echo ""
echo "=========================================="
echo "  Setup Complete!                        "
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Run 'pnpm dev' to start the development environment"
echo "     (This will start Docker, database, API, and Web)"
echo ""
echo "  Or start services individually:"
echo "  - API: pnpm --filter @homethrive/api dev"
echo "  - Web: pnpm --filter @homethrive/web dev"
echo ""
