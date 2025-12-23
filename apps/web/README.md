# @homethrive/web

TanStack Start SPA frontend for HomeThrive Medication Manager.

## Tech Stack

- [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- [TanStack Router](https://tanstack.com/router) - Type-safe routing
- [Clerk](https://clerk.com/docs) - Authentication
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Tailwind CSS v4](https://tailwindcss.com) - Styling

## Getting Started

```bash
# Install dependencies (from monorepo root)
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env and add your Clerk publishable key

# Start dev server
pnpm dev
```

## Commands

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm preview    # Preview production build locally
pnpm typecheck  # Run TypeScript type checking
pnpm lint       # Run ESLint
pnpm lint:fix   # Fix ESLint issues
```

## Deployment

The frontend is deployed to AWS using S3 + CloudFront, managed by CDK in `packages/infra`.

**Full infrastructure deploy** (includes API, database, frontend hosting):
```bash
pnpm --filter @homethrive/infra deploy
```

**Frontend-only deploy** (after infrastructure exists):
```bash
./packages/infra/scripts/deploy-frontend.sh
```

The deploy script:
1. Builds the app with production environment variables
2. Syncs assets to S3 with appropriate cache headers
3. Invalidates the CloudFront cache

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (required) |
| `VITE_API_URL` | Backend API URL (set automatically during deploy) |

## Project Structure

```
src/
├── routes/           # TanStack Router file-based routes
│   ├── __root.tsx    # Root layout
│   ├── _authed.tsx   # Authenticated layout wrapper
│   └── _authed/      # Protected routes
├── components/       # Shared components
├── styles/           # Global styles
└── utils/            # Utility functions

components/ui/        # shadcn/ui components
hooks/                # Custom React hooks
lib/                  # Utility libraries
```
