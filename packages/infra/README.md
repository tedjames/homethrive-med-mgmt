# @homethrive/infra

Infrastructure as Code package using AWS CDK to provision and manage all AWS resources for HomeThrive.

## Overview

- **AWS CDK v2**: Type-safe infrastructure definitions in TypeScript
- **Serverless Architecture**: REST API Gateway + Lambda for cost-effective scaling
- **Managed Database**: RDS Postgres with RDS Proxy for Lambda connection pooling
- **Frontend Hosting**: S3 + CloudFront for static SPA hosting
- **WAF Protection**: AWS WAF on both CloudFront and API Gateway (see ADR-006)
- **Secrets Management**: AWS Secrets Manager for database credentials and Clerk keys
- **Observability**: CloudWatch Logs, Metrics, and Alarms

---

## Purpose

The `@homethrive/infra` package defines and deploys the AWS infrastructure required to run HomeThrive in production. It provides:

1. **Resource Provisioning**: VPC, RDS, Lambda, REST API Gateway, S3, CloudFront, WAF
2. **Security Configuration**: IAM roles, security groups, WAF rules, encryption at rest/in transit
3. **Database Migrations**: Lambda function for running Drizzle migrations
4. **Cost Control**: Resource tagging and budget-conscious defaults
5. **Monitoring**: CloudWatch alarms for Lambda errors and duration

### Architectural Role

```
┌───────────────────────────────────────────────────────────┐
│                      @homethrive/infra                    │
│                     (AWS CDK Stacks)                      │
└───────────────────────┬───────────────────────────────────┘
                        │ provisions
                        ▼
┌───────────────────────────────────────────────────────────┐
│                        AWS Cloud                          │
│                                                           │
│  Frontend:                                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  WAF (CloudFront scope)                             │  │
│  │    ↓                                                 │  │
│  │  CloudFront Distribution                            │  │
│  │    ↓                                                 │  │
│  │  S3 Bucket (static assets)                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Backend:                                                 │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  WAF (Regional scope)                               │  │
│  │    ↓                                                 │  │
│  │  REST API Gateway                                   │  │
│  │    ↓                                                 │  │
│  │  Lambda Function (Fastify API from apps/api)        │  │
│  │    ↓                                                 │  │
│  │  RDS Proxy (private subnet)                         │  │
│  │    ↓                                                 │  │
│  │  RDS Postgres 16 (isolated subnet)                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Supporting Services:                                     │
│  • Secrets Manager: DB credentials, Clerk keys           │
│  • CloudWatch: Logs, Metrics, Alarms                     │
│  • VPC: Public, private, and isolated subnets            │
│  • NAT Gateway: Lambda outbound internet (Clerk auth)    │
│  • IAM: Roles and policies                               │
└───────────────────────────────────────────────────────────┘
```

### Key Responsibilities

**Infrastructure Provisioning**:
- Define AWS resources using CDK constructs (VPC, RDS, Lambda, API Gateway, S3, CloudFront, WAF)
- Generate CloudFormation templates from CDK code
- Deploy/update stacks with `pnpm deploy`

**Security**:
- WAF protection on both CloudFront and API Gateway (rate limiting, SQL injection, XSS, IP reputation)
- Enforce encryption at rest (RDS, S3) and in transit (TLS)
- Apply least-privilege IAM policies
- Store sensitive credentials in Secrets Manager (never in code)
- VPC isolation: RDS in isolated subnets, Lambda in private subnets

**Database Management**:
- Migration Lambda for running Drizzle migrations automatically during deploy

---

## Setup

### Prerequisites

- Node.js 22+
- pnpm 9+
- AWS CLI configured with credentials (`aws configure`)
- AWS CDK CLI installed globally: `npm install -g aws-cdk`
- AWS account with appropriate permissions (CloudFormation, RDS, Lambda, IAM, etc.)

### Installation

From the monorepo root:

```bash
pnpm install
```

### Bootstrap CDK (First-Time Setup)

```bash
# Bootstrap AWS account for CDK (one-time per account/region)
cdk bootstrap aws://123456789012/us-east-1
```

---

## Usage Guide

### Package Architecture

```
packages/infra/
├── bin/
│   └── app.ts                  # CDK app entry point
├── lib/
│   ├── homethrive-stack.ts     # Main stack definition
│   └── constructs/
│       ├── api.ts              # Lambda + REST API Gateway + WAF association
│       ├── database.ts         # VPC + RDS + RDS Proxy + Secrets
│       ├── frontend.ts         # S3 + CloudFront for SPA hosting
│       ├── migration.ts        # Migration Lambda (Drizzle)
│       ├── monitoring.ts       # CloudWatch alarms
│       └── waf.ts              # WAF WebACL configuration
├── scripts/
│   ├── deploy.sh               # Interactive deployment script
│   ├── destroy.sh              # Infrastructure teardown
│   └── validate.sh             # Post-deployment health checks
├── cdk.json                    # CDK configuration
└── tsconfig.json
```

---

## Infrastructure Components

### 1. VPC (Virtual Private Cloud)

**Purpose**: Network isolation with public, private, and isolated subnets.

**Configuration:**
- **Public Subnets**: NAT Gateway, Internet Gateway
- **Private Subnets (with egress)**: Lambda functions, RDS Proxy (internet via NAT)
- **Isolated Subnets**: RDS instances (no internet access)
- **Availability Zones**: 2 AZs for high availability
- **NAT Gateway**: 1 (required for Lambda to call Clerk API)

**Location**: Embedded in `lib/constructs/database.ts`

### 2. RDS Postgres + RDS Proxy

**Purpose**: Managed PostgreSQL database with connection pooling for Lambda.

**Configuration:**
- **Engine**: PostgreSQL 16
- **Instance Type**: `t4g.micro` (burstable)
- **Storage**: 20 GB initial, auto-scaling up to 50 GB
- **Multi-AZ**: Disabled (cost optimization; enable for HA)
- **Backups**: 7 days retention
- **Encryption**: At rest via KMS, in transit via TLS
- **Deletion Protection**: Disabled (for demo teardown; enable for production)

**RDS Proxy Benefits:**
- Connection pooling (critical for Lambda)
- TLS required
- Password authentication via Secrets Manager (not IAM auth - see ADR-003)

**Location**: `lib/constructs/database.ts`

### 3. Lambda Functions

**API Lambda** (`lib/constructs/api.ts`):
- **Purpose**: Run Fastify API from `apps/api`
- **Runtime**: Node.js 22.x
- **Memory**: 1024 MB
- **Timeout**: 30 seconds
- **VPC**: Deployed in private subnets (access to RDS Proxy and internet via NAT)
- **Bundling**: esbuild with minification and source maps

**Migration Lambda** (`lib/constructs/migration.ts`):
- **Purpose**: Run Drizzle database migrations
- **Runtime**: Node.js 22.x
- **Memory**: 512 MB
- **Timeout**: 5 minutes
- **Invoked**: Automatically during deployment

### 4. REST API Gateway

**Purpose**: REST API Gateway routing requests to Lambda with WAF protection.

**Configuration:**
- **Type**: REST API (required for WAF support - see ADR-006)
- **Throttling**: 50 requests/second, 100 burst
- **CORS**: Configured for all origins and methods
- **WAF**: Associated with regional WebACL

**Location**: `lib/constructs/api.ts`

### 5. Frontend (S3 + CloudFront)

**Purpose**: Static hosting for the TanStack Start SPA.

**Configuration:**
- **S3 Bucket**: Private, CloudFront access only via Origin Access Control
- **CloudFront**: HTTPS redirect, HTTP/2 and HTTP/3, SPA routing (404→_shell.html)
- **Price Class**: North America and Europe only (cost savings)
- **WAF**: Associated with CloudFront-scope WebACL

**Location**: `lib/constructs/frontend.ts`

### 6. WAF (Web Application Firewall)

**Purpose**: Protect against DDoS, SQL injection, XSS, and known exploits.

**Configuration** (applied to both CloudFront and API Gateway):
| Rule | Priority | Description |
|------|----------|-------------|
| Rate Limiting | 1 | Block IPs exceeding 2000 requests per 5 minutes |
| AWS Common Rule Set | 2 | SQL injection, XSS, bad inputs |
| Known Bad Inputs | 3 | Log4j, Java deserialization, etc. |
| IP Reputation List | 4 | Block known malicious IPs |

**Location**: `lib/constructs/waf.ts`


### 7. Secrets Manager

**Purpose**: Store sensitive credentials.

**Secrets:**
- `homethrive/db`: Database credentials (auto-generated)
- `homethrive/clerk`: Clerk secret key (configured during deployment)

### 8. CloudWatch Monitoring

**Purpose**: Monitor system health.

**Alarms:**
- Lambda function errors (≥5 errors in 5 minutes)
- Lambda duration approaching timeout (p99 ≥25s)

**Location**: `lib/constructs/monitoring.ts`

---

## Deployment

### Deploy to AWS

The deploy script handles everything interactively:

```bash
# From packages/infra
pnpm deploy

# Or from monorepo root
pnpm --filter @homethrive/infra deploy
```

The deploy script will:
1. Verify AWS credentials
2. Create RDS service-linked role if needed
3. Prompt for Clerk secret key (if not already configured)
4. Prompt for alert email (optional)
5. Deploy CDK stack
6. Run database migrations automatically
7. Store secrets in AWS Secrets Manager
8. Validate deployment with health checks

### Environment Variables

The stack name is configurable:

```bash
# Default stack name
STACK_NAME=homethrive-test-ted pnpm deploy

# Custom stack name
STACK_NAME=my-custom-stack pnpm deploy
```

Other environment variables:
- `AWS_REGION`: AWS region (default: us-east-1)
- `CDK_DEFAULT_ACCOUNT`: AWS account ID
- `ALERT_EMAIL`: Email for CloudWatch alarm notifications

### View Changes Before Deploying

```bash
pnpm --filter @homethrive/infra diff
```

### Synthesize CloudFormation

```bash
pnpm --filter @homethrive/infra synth
```

### Destroy Stack

```bash
pnpm --filter @homethrive/infra destroy
```

**Warning**: This deletes all resources including the database. Use with caution.

---

## Stack Outputs

After deployment, CDK outputs key values:

```
Outputs:
homethrive-test-ted.ApiUrl = https://abc123.execute-api.us-east-1.amazonaws.com/prod/
homethrive-test-ted.FrontendUrl = https://d1234567890.cloudfront.net
homethrive-test-ted.ProxyEndpoint = homethrive.proxy-xyz.us-east-1.rds.amazonaws.com
homethrive-test-ted.BucketName = homethrive-test-ted-frontend-bucket-xyz
```

---

## Resource Tagging

All resources are tagged for identification:

```typescript
cdk.Tags.of(stack).add('Project', stackName);
```

---

## Integration with Other Packages

### Depends On: `apps/api`

The API Lambda construct bundles the Fastify app from `apps/api`:

```typescript
// lib/constructs/api.ts
new nodejs.NodejsFunction(this, 'Function', {
  entry: path.join(__dirname, '../../../../apps/api/src/lambda.ts'),
  // ...
});
```

### Depends On: `packages/db`

The Migration Lambda bundles the migration handler from `packages/db`:

```typescript
// lib/constructs/migration.ts
new nodejs.NodejsFunction(this, 'Function', {
  entry: path.join(__dirname, '../../../../packages/db/src/lambda-migrate.ts'),
  // ...
});
```

---

## Key Design Decisions

### 1. REST API Gateway over HTTP API

**Decision:** Use REST API Gateway (not HTTP API).

**Rationale:**
- AWS WAF cannot attach to HTTP API Gateway
- REST API supports WAF for comprehensive security

### 2. RDS Proxy for Lambda

**Decision:** Use RDS Proxy between Lambda and RDS.

**Rationale:**
- Lambda functions create many short-lived connections
- RDS has connection limits (t4g.micro: ~85 connections)
- RDS Proxy pools connections, preventing "too many connections" errors
- See **ADR-003** for full analysis

### 3. Password Auth over IAM Auth

**Decision:** Use password authentication via Secrets Manager (not IAM auth).

**Rationale:**
- Simpler integration with standard `DATABASE_URL`
- Minimal code changes required
- Secrets Manager supports automatic rotation if needed
- See **ADR-003** for full analysis

### 4. Lambda in VPC with NAT Gateway

**Decision:** Deploy Lambda in VPC private subnets with NAT Gateway.

**Rationale:**
- Required to access RDS Proxy (in VPC)
- NAT Gateway required for Lambda to reach Clerk API for authentication
- More secure (no public IP for Lambda)
- See **ADR-003** for full analysis

### 5. Three Subnet Types

**Decision:** Use public, private (with egress), and isolated subnets.

**Rationale:**
- **Public**: NAT Gateway placement
- **Private with egress**: Lambda (needs internet for Clerk)
- **Isolated**: RDS (no internet access for security)

---

## Cost Estimates

### Monthly Cost (estimated)

| Component | Cost |
|-----------|------|
| RDS t4g.micro | ~$12 |
| RDS Proxy | ~$22 |
| NAT Gateway | ~$32 |
| WAF (2 WebACLs, 4 rules each) | ~$20 |
| Lambda (free tier) | ~$0 |
| REST API Gateway | ~$3.50 per 1M requests |
| CloudFront | ~$0-5 (depends on traffic) |
| S3 | ~$0.50 |
| Secrets Manager (2 secrets) | ~$1 |
| CloudWatch | ~$1 |
| **Total** | **~$90-95/month** |

**Cost Optimization Tips:**
- Disable NAT Gateway if Lambda doesn't need internet access
- Use smaller RDS instance or Aurora Serverless for variable workloads
- Consider reserved capacity for predictable workloads

---

## Related Documentation

- **ADR-003**: Infrastructure Networking (VPC, NAT, RDS Proxy, Auth)
