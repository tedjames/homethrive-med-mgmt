# HomeThrive Medication Manager

A full-stack application for caregivers to manage medications for care recipients. Supports adding medications with schedules (daily/weekly recurrence), viewing upcoming doses and marking doses as taken. Web app and API is meant to be deployed via AWS CDK.

## How the UX Works

Every user in the system can be both a care recipient and caregiver for others.

### Getting Started as a User

1. **Sign Up**: Create an account using Clerk authentication (email auth only at the moment)
2. **Complete Onboarding**: Set up your profile with your display name and timezone
3. **Select a Role**: Designate yourself as a care recipient and/or caregiver

### Managing Care for Others

To manage medications for someone else they must:

1. **Have their own account** - The person you want to care for needs to sign up first
2. **Grant you access** - They invite you as a caregiver from their Settings page (or you can request access)

Once connected, you can switch between managing your own medications and theirs using the dropdown in the sidebar.

### Settings Page

The Settings page has three tabs:
- **My Profile**: Modify your name and timezone
- **My Caregivers**: See who has access to your profile, approve/deny requests, invite new caregivers, revoke access
- **People I Care For**: See who you're caring for, accept/decline invitations, request access to new people

### Medications & Data Lifecycle

- **Safe Modifications**: Editing, ending, or deactivating medications and schedules preserves all historical dose data to ensure a reliable record of care.
- **Deactivation**: Deactivating a medication hides it from the schedule but keeps all data intact, allowing it to be reactivated at any time.
- **Permanent Deletion**: Hard deletes a medication, its schedules, and its entire dose history. This action is irreversible.
- **Safety Guard**: Medications must be deactivated before they can be permanently deleted to prevent accidental data loss.

### Timezone Handling

Schedules are always displayed in the care recipient's local timezone:

- **Your own medications**: Displayed in the timezone you set during onboarding
- **Caring for others**: Displayed in the care recipient's timezone, not yours

This means a caregiver in California viewing a New York recipient's 11pm dose will see it correctly grouped under the recipient's local date, not shifted to the caregiver's timezone. See [ADR-005](docs/ADR-005-timezones.md) for more on this.

## Project Structure

```
homethrive/
├── packages/
│   ├── core/     # Domain logic (hexagonal/clean architecture)
│   ├── db/       # Drizzle ORM schema, migrations and repositories
│   └── infra/    # AWS CDK infrastructure
├── apps/
│   ├── api/      # Fastify API for AWS Lambda
│   └── web/      # TanStack Start React frontend (client-side rendered)
└── scripts/
|   ├── setup.sh  # Initial dev environment setup
|   └── dev.sh    # Start local dev environment
└── docs/         # Architecture decision records and requirements
```

## Prerequisites

- Node.js 22+ (required - Lambda runtime uses Node.js 22)
- pnpm 9+
- Docker Desktop (for local database)
- AWS CLI configured (for infrastructure deployment)

The setup script (`pnpm dev:setup`) will verify you have the correct Node.js version installed.

### AWS IAM Permissions

For deployment, your AWS user/role needs these permissions:
- **CloudFormation, Lambda, API Gateway, RDS, VPC, S3, CloudFront, Secrets Manager** - for infrastructure provisioning
- **iam:CreateServiceLinkedRole** - required for first-time RDS Proxy deployment

The deploy script automatically creates the RDS service-linked role if it doesn't exist. If you're in an enterprise environment without IAM permissions, ask your admin to run this command:

```bash
aws iam create-service-linked-role --aws-service-name rds.amazonaws.com
```

This should be a one-time, account-wide operation.

## Quick Start

### New Developer Setup

```bash
git clone git@github.com:tedjames/homethrive-med-mgmt.git
pnpm dev:setup    # Prompts you for keys, creates .env files and builds all packages
```

### Running Locally

```bash
pnpm dev      # Starts database (:5437), API (:3200), and Web (:5200)
```

### Deploy to AWS

```bash
pnpm deploy:backend   # Deploy infrastructure (VPC, RDS, Lambda, API Gateway, S3, CloudFront)
pnpm deploy:frontend  # Build and upload frontend to S3/CloudFront
pnpm deploy:all       # Deploy both backend and frontend
pnpm destroy          # Tear down all AWS resources
```

After deploying you can run `pnpm health:check` to hit the health check endpoint on the API for further validation (this is already apart of the deployment script but may not always return a success response as AWS requires some time to provision resources).

You should be prompted to provide a cloudwatch alert email and if you ever want to change it without redeploying, you can use this command: `pnpm alerts:email`


**Note on Clerk Keys:** When prompted for a Clerk key during deployment, you can use your test keys (sk_test_...). Clerk test keys work on any domain including the Cloudfront URL. You don't need production keys or a custom domain.

**Note on Database Deletion Protection:** This demo application has RDS deletion protection disabled so you can easily tear down all resources with `pnpm destroy`. For a production app, this would of course be enabled (deletion protection) in `packages/infra/lib/constructs/database.ts` to prevent accidental data loss.

**Verifying Resource Cleanup:** After running `pnpm destroy`, you can verify all resources are cleaned up with:

```bash
pnpm audit:aws     # Lists any remaining HomeThrive tagged resources in AWS
pnpm health:check  # Should return error if infra is taken down
```

Note that AWS's resource tagging API has eventual consistency - so deleted resources may still appear in the audit for 15-20 minutes after destruction. You can verify a resource is actually deleted by querying it directly (`aws ec2 describe-nat-gateways --nat-gateway-ids <id>`). A `deleted` state or `not found` error confirms the resource is gone.

Also, if deletion fails at first attempt - try again. CDK can be a little wierd sometimes (also fyi, it takes FOREVER sometimes) 🤷‍♂️

### Other Commands

```bash
pnpm install    # Install deps for all packages
pnpm build      # Build all packages
pnpm test       # Run all tests
pnpm typecheck  # Type check all packages
```

## Package Commands

### Core Package (`packages/core`)

```bash
pnpm --filter @homethrive/core test        # Run tests
pnpm --filter @homethrive/core test:watch  # Watch mode
pnpm --filter @homethrive/core typecheck   # Type check
pnpm --filter @homethrive/core lint        # Lint
```

### Database Package (`packages/db`)

```bash
pnpm --filter @homethrive/db test          # Run tests (requires Docker)
pnpm db:generate                           # Generate Drizzle migrations
pnpm db:migrate                            # Run migrations
pnpm --filter @homethrive/db db:studio     # Open Drizzle Studio
pnpm --filter @homethrive/db db:reset      # Reset database (destructive)
```

### API Package (`apps/api`)

```bash
pnpm --filter @homethrive/api dev          # Run dev server
pnpm --filter @homethrive/api test         # Run tests (requires Docker)
pnpm --filter @homethrive/api test:smoke   # Run smoke tests against deployed API
pnpm --filter @homethrive/api build        # Build for production
pnpm --filter @homethrive/api typecheck    # Type check
```

## Infrastructure

The infrastructure package (`packages/infra`) uses AWS CDK to provision:

- **VPC** with private + isolated + public subnets and NAT Gateway
- **RDS Postgres** (db.t4g.micro) in isolated subnet
- **RDS Proxy** in private subnet for Lambda connection pooling
- **Lambda** functions in private subnet (API + Migration)
- **REST API Gateway** with WAF protection
- **S3 + CloudFront** for frontend static hosting (with WAF)
- **AWS WAF** on both CloudFront and API Gateway for DDoS/attack protection
- **Secrets Manager** for database and Clerk credentials
- **CloudWatch** alarms for monitoring

See [ADR-003](docs/ADR-003-infrastructure.md) for architecture decisions around our AWS infrastructure.

### Resource Breakdown (~68 resources)

Full deployment takes roughly about 15 minutes or so. Subsequent deployments/updates are MUCH faster since unchanged resources are skipped. The deployment creates around 68 AWS resources:

**VPC & Networking**: ~25 VPC, 6 subnets (2 per type across 2 AZs), route tables, NAT Gateway, Internet Gateway, Elastic IP 
**Security**: ~10 Security groups and rules for RDS, RDS Proxy, and Lambda functions 
**Database**: ~8 RDS PostgreSQL instance, RDS Proxy, DB subnet group, Secrets Manager secrets 
**Lambda**: ~10 2 functions (API + Migration), IAM roles/policies, CloudWatch log groups 
**API Gateway**: ~5 HTTP API, routes, Lambda integration, stage 
**Frontend**: ~6 S3 bucket, bucket policy, CloudFront distribution, Origin Access Control 
**Monitoring**: ~4 CloudWatch alarms for error rates and latency 

### Deploy Infrastructure

```bash
# Synthesize CF template to verify CDK compiles locally (optional)
pnpm --filter @homethrive/infra synth

# View changes before deploying (optional)
pnpm --filter @homethrive/infra diff

# Deploy to AWS
pnpm --filter @homethrive/infra deploy
```

### Validate Deployment

After deploying, validate the API is healthy:

```bash
pnpm --filter @homethrive/infra validate
```

This runs health checks against the deployed API endpoint.

### Destroy Infrastructure

```bash
pnpm --filter @homethrive/infra destroy
```

This tears down all AWS resources created by the stack. Use with caution in production.

### Audit Infrastructure

After deploying or destroying infrastructure, you can audit what AWS resources exist:

```bash
pnpm audit:aws     # Lists all HomeThrive resources in AWS
```

The audit command checks:

1. **CloudFormation stack status** - Reports if the stack exists and its current state
2. **Tagged resources** - Uses AWS Resource Groups Tagging API to find resources with `Project=<stack-name>` tag
3. **Legacy tag check** - Also checks for the legacy `Project=HomeThrive` tag to catch older deployments
4. **Secrets Manager** - Checks for any `homethrive/*` secrets that may remain

**Use cases:**
- Verify a deployment succeeded by confirming resources exist
- Confirm all resources are cleaned up after running `pnpm destroy`
- Find orphaned resources that weren't properly deleted

**Note:** AWS's resource tagging API has eventual consistency - deleted resources may still appear in the audit for 15-20 minutes after destruction. If you see resources after destroying the stack, wait a few minutes and re-run the audit.

### Stack Name Configuration

By default, the CloudFormation stack is named `homethrive-test-ted` and all resources are tagged with `Project=homethrive-test-ted`. This makes it easy for reviewers to identify and clean up the deployment.

To customize the stack name for your own deployment:

```bash
# Deploy with custom stack name
STACK_NAME=homethrive-test-jane pnpm deploy:backend

# Audit with custom stack name
STACK_NAME=homethrive-test-jane pnpm audit:aws

# Destroy with custom stack name
STACK_NAME=homethrive-test-jane pnpm destroy
```

The audit command always checks for both the configured stack name AND the legacy `HomeThrive` tag to ensure complete cleanup.

### Estimated Monthly Costs

- RDS db.t4g.micro: ~$12 (free tier eligible)
- RDS Proxy: ~$22
- NAT Gateway: ~$32
- AWS WAF (2 WebACLs): ~$18
- REST API Gateway: ~$3.50 per 1M requests
- Secrets Manager: ~$0.40
- Lambda: ~$0 (free tier)

**Total**: **~$88/month**

See [ADR-003](docs/ADR-003-infrastructure.md) for the full cost breakdown.

## Environment Variables

### Web App (`apps/web`)
- `VITE_API_URL` = http://localhost:3200
- `VITE_CLERK_PUBLISHABLE_KEY` = pk_test_xxxxxxxx

### API (`apps/api`)

- `DATABASE_URL` = postgresql://homethrive:dev_password@localhost:5437/homethrive_dev
- `ENABLE_CLERK` = Enable Clerk authentication (true/false)
- `NODE_ENV` = Environment (development/production/test)
- `CLERK_PUBLISHABLE_KEY` = pk_test_xxxxxxxx
- `CLERK_SECRET_KEY` = sk_test_xxxxxxxx
- `PORT` = 3200
- `HOST` = 0.0.0.0
- `NODE_ENV` = development

## Architecture

Refer to the ADRs in our `/docs` folder for more in-depth breakdowns of key decisions we made around the architecture.

### Project Structure

I decided to roll with a monorepo to make this repo as developer friendly and easy to work with as possible. Monorepos are great since you can build multiple apps and share packages between them all within the same repo! A lot of the developer tooling is also consolidated in one place now which lets us create some pretty neat bash scripts for test automation, dev env setup and deployment for all our resources/artifacts - all accessible from the root of our monorepo.

I also decided to roll with a clean/hexagonal architecture inspired setup which keeps domain logic completely isolated from infrastructure concerns like databases and API frameworks.

#### The Hexagonal Pattern (Ports & Adapters)

The core idea is that business logic lives at the center and doesn't know about the outside world. Instead, we define ports (interfaces) that the domain needs and adapters (implementations) that plug into those ports.

By leveraging this kind of hexagonal structure - everything is...

- **Testable**: Domain services are tested with mock repositories - no database needed! See `packages/core/src/domains/*/__tests__/` for examples of this
- **Swappable**: You can replace Drizzle with Prisma, or PostgreSQL with DynamoDB - all by writing new adapters. Core logic stays untouched
- **Focused**: Each layer has one job. Core owns business rules, db owns persistence and api connections to the outside world
- **Framework-agnostic**: Core package has zero dependencies on Fastify, Drizzle or AWS - just depends on Zod for validation and Luxon for dates

**The Three Layers:**

1. **`packages/core`** — The domain layer. Contains business logic, entity types, Zod schemas and repository interfaces (ports). Has zero dependencies on Drizzle, Fastify, or AWS. Services like `createMedicationService(repo)` receive repository interfaces via dependency injection.

2. **`packages/db`** — The database implementation. This is where we actually talk to Postgres using Drizzle ORM. It takes the database operations defined in core (like `MedicationRepository`) and provides the real DB integration to execute them. This keeps core clean of any database-specific logic.

3. **`apps/api`** — The API adapter/layer. Fastify API routes call into domain services - receiving requests and driving them to the core package domains. The container.ts file wires up repositories to services

#### Example: Medications Domain

**1. Port (interface in `packages/core`):**
```typescript
// packages/core/src/domains/medications/repository.ts
export interface MedicationRepository {
  findById(userId: UserId, medicationId: string): Promise<Medication | null>;
  create(userId: UserId, recipientId: string, input: CreateMedicationInput): Promise<Medication>;
  createWithSchedules(...): Promise<{ medication: Medication; schedules: MedicationSchedule[] }>;
  // ...
}
```

**2. Service (business logic in `packages/core`):**
```typescript
// packages/core/src/domains/medications/service.ts
export function createMedicationService(repo: MedicationRepository) {
  async function create(userId, recipientId, input, schedules) {
    if (!schedules || schedules.length === 0) {
      throw new MedicationRequiresScheduleError(); // Business rule enforced here
    }
    const result = await repo.createWithSchedules(...);
    return result.medication;
  }
  return { create, getById, update, setInactive, listByRecipient };
}
```

**3. Adapter (implementation in `packages/db`):**
```typescript
// packages/db/src/repositories/medication.repository.ts
export class DrizzleMedicationRepository implements MedicationRepository {
  constructor(private readonly db: DbClient) {}

  async createWithSchedules(userId, recipientId, medInput, schedulesInput) {
    return this.db.transaction(async (tx) => {
      // Drizzle-specific SQL operations
      const medRows = await tx.insert(medications).values({...}).returning();
      const scheduleRows = await tx.insert(medicationSchedules).values([...]).returning();
      return { medication: toDomain(medRows[0]), schedules: scheduleRows.map(toScheduleDomain) };
    });
  }
}
```

**4. Composition (wiring in `apps/api`):**
```typescript
// apps/api/src/container.ts
export function createContainer(databaseUrl: string): Container {
  const db = createDb(databaseUrl);
  const medicationRepository = new DrizzleMedicationRepository(db);
  const medicationService = createMedicationService(medicationRepository);
  return { medicationService, /* ... */ };
}
```

#### Testing Strategy

This architecture enables a clean testing pyramid:

- **Unit tests** (`packages/core`): Fast, isolated tests using mock repositories. Test business rules without touching a database.
- **Integration tests** (`packages/db`): Spins up Postgres in Docker and verifies Drizzle queries work correctly.
- **Contract tests** (`apps/api`): Validates that API responses match Zod schemas defined in `schemas/responses.ts`. Catches breaking changes to the API contract before they ship.
- **API tests** (`apps/api`): Full HTTP tests against Fastify routes with a real database.
- **Smoke tests**: Hits deployed endpoints to verify production is healthy.

### Domain Model

- **Care Recipients**: People receiving medication care
- **Medications**: Drugs with name and active status
- **Schedules**: Daily/weekly recurrence patterns with time of day
- **Doses**: Computed on-the-fly from schedules within a time window
- **Dose Taken**: Persisted records of taken medications

### Key Design Decisions

1. **Doses are computed, not stored**: Only "taken" events are persisted
2. **Medications cannot be deleted**: Only marked as `isActive=false`
3. **Weekly schedules use ISO weekdays**: 1=Monday through 7=Sunday
4. **Lambda in VPC with NAT Gateway**: Secure architecture per ADR-003; Lambda in private subnet for RDS access, NAT for Clerk auth

For all other architectural design decisions, refer to:

- [ADR-001-database](docs/ADR-001-database.md)
- [ADR-002-dose-model](docs/ADR-002-dose-model.md)
- [ADR-003-infrastructure](docs/ADR-003-infrastructure.md)
- [ADR-004-frontend-rendering-strategy](docs/ADR-004-frontend-rendering-strategy.md)
- [ADR-005-timezones](docs/ADR-005-timezones.md)

## Running Tests

```bash
# Run all tests across the monorepo
pnpm test

# Run tests for a specific package
pnpm --filter @homethrive/core test
pnpm --filter @homethrive/db test
pnpm --filter @homethrive/api test

# Run a single test file
pnpm --filter @homethrive/core vitest run src/domains/doses/__tests__/recurrence.test.ts
```

## Smoke Tests

Run smoke tests against a deployed API. The test suite has two categories:

1. **Unauthenticated tests** (always run): Health check + protected route verification
2. **Authenticated tests** (requires AUTH_TOKEN): CRUD operations on recipients, medications, doses

```bash
# Unauthenticated tests only (health check + verifies 401 on protected routes)
pnpm --filter @homethrive/api test:smoke

# Full test suite against localhost (any string works as token in dev mode)
AUTH_TOKEN=test-user pnpm --filter @homethrive/api test:smoke

# Full test suite against production (requires real Clerk JWT)
API_URL=https://api.your-domain.com AUTH_TOKEN=<clerk-jwt> pnpm --filter @homethrive/api test:smoke
```

**Note on AUTH_TOKEN:** In development/test mode you can set `ENABLE_CLERK` to `false` in your .env file to bypass auth and the API will accept any bearer token as a user identifier. In production mode, a valid JWT or M2M token is required. An M2M token can be obtained via enabling M2M tokens in the Clerk dashboard.

## Out of Scope

- SMS/Email Reminderes: I was going to wire up SQS + Eventbridge to a reminders lambda to send email reminders but that's a bit of a lift! For future reference though, if you want to do this and still test reminders locally, you can use AWS Lightsail + a forward reverse proxy (frpc via brew) to have your staging lambda update a local database. You'll ideally want to pass the host IP via the event so you can have a single Lightsail instance for multiple developers. Currently doing this in another project for testing reminders e2e and it works really well!

- AWS Cognito/Lambda Authorizer: I mean, this would make the app live purely on AWS which is nice but... I like Clerk and figured this shortcut would save me a bit of time. Clerk comes with some neat features out of the box as well which makes security and adding multiple IDPs a bit easier!

- Multiple Environents: Keeping it simple and to save $$$, limited this to just one prod environment. If we were deploying to multiple envs, I'd consider different infra configurations to minimize cost in lower envs and maximize for scalability in prod.

- UI test automation: Just didn't have time to do this! Ideally, we'd have playwright or cypress automation w/ UI fixtures for true e2e testing.

- Clerk Webhooks: When a user deletes their account through Clerk, their data remains orphaned in our database. We need a webhook endpoint to listen for user.deleted events and clean up the user's data. We'd also want to handle `user.updated` events to sync profile changes made in Clerk back to our database. Just didn't have time to wire this up!

- Clerk Production Setup: When deploying to prod just use your test credentials so you don't have to wire up a static domain.

- Dose History Page: A dedicated page for viewing the full history of taken and missed doses would be useful for caregivers to audit medication compliance over time

- Infinite Scroll Edge-Cases: There are some additional edge cases / optimizations we could have made here specifically if a user only has one medication scheduled weekly and if it's 6 days out - a bunch of API calls are made in succession. This could be optimized of course but wasn't done in the interest of time.

- Github CI Workflows: Ideally we would have pipelines to run all tests and a trunk-based branching stategy with feature branches that deploy to a live AWS dev env (like how Vercel preview envs work). Left this out in the interest of time.