# ADR-001 - Infrastructure Networking
_VPC, NAT Gateway, RDS Proxy and Database Authentication_

## Context

Our API runs as a Lambda function that needs to:

1. **Connect to RDS Postgres** for data persistence
2. **Call external APIs** (Clerk for authentication)
3. **Handle concurrent connections** efficiently (Lambda can spawn many instances)

We need to decide on the networking topology and authentication method for database access. Few key questions here:

- Should Lambda run inside or outside the VPC?
- Do we need RDS Proxy for connection pooling?
- Should we use IAM authentication or password-based authentication for the database?
- How do we balance security, cost and complexity?

These decisions are important because:

- Lambdas outside VPCs can't reach RDS proxies inside a VPC
- Authentication is not in sync with CDK configuration + application code
- Need to establish a prod-ready, secure architecture

## Decision

I decided to go with the following architecture:

1. **Lambda in VPC** with private subnets
2. **NAT Gateway** for outbound internet access (Clerk API calls)
3. **RDS Proxy** in private subnets for connection pooling
4. **RDS Postgres** in isolated subnets (no internet access)
5. **Password authentication via Secrets Manager** (not IAM auth)

Network topology:

1. Internet
2. API Gateway (public)
3. Lambda (VPC, private subnet)
  - NAT Gateway -> Internet (with Clerk auth)
  - RDS Proxy (private subnet)
    - RDS Postgres (isolated subnet)


## Alternatives Considered

### Lambda Placement

- **Option A: Lambda in VPC + NAT Gateway**
  - Description: Lambda in private subnet, NAT for internet
  - Pros: Secure; RDS Proxy stays private; industry best practice
  - Cons: +$32/month for NAT Gateway

- **Option B: Lambda outside VPC + RDS Proxy public**
  - Description: Lambda public, expose RDS Proxy to internet
  - Pros: No NAT cost; simpler
  - Cons: Security risk; RDS Proxy not designed for public exposure; requires additional security hardening

- **Option C: Lambda outside VPC + RDS public**
  - Description: Direct Lambda→RDS connection, RDS publicly accessible
  - Pros: Simplest; no proxy or NAT cost
  - Cons: Significant security risk; database exposed to internet; no connection pooling

- **Option D: Lambda in VPC + VPC Endpoints (no NAT)** (Deferred)
  - Description: Use AWS PrivateLink for Clerk/external APIs
  - Pros: Lower cost than NAT ($7-14/month)
  - Cons: Clerk may not support PrivateLink; more complex setup; less flexible for future integrations

**Rationale for Option A:**
- Security: All database infrastructure remains private
- Simplicity: NAT Gateway is fully managed
- Future-proof: Easy to add more AWS services or external API calls
- Industry standard: This is the recommended AWS architecture for Lambda + RDS

### RDS Proxy Usage

- **Option A: Use RDS Proxy**
  - Description: Connection pooling between Lambda and RDS
  - Pros: Handles connection scaling; reduces connection exhaustion; faster connection reuse
  - Cons: +$22/month; adds component

- **Option B: Direct Lambda→RDS**
  - Description: Lambda connects directly to RDS
  - Pros: Simpler; lower cost
  - Cons: Risk of connection exhaustion under load; each Lambda instance = new connection; db.t4g.micro has ~80 connection limit

**Rationale for Option A:**
- Lambda functions are ephemeral; without pooling, each cold start creates a new database connection
- RDS Proxy multiplexes many Lambda connections into fewer database connections
- Prevents a too many connections error during high traffic spikes
- Provides automatic failover handling for multi-AZ infra

### Database Auth

- **Option A: Password via Secrets Manager**
  - Description: Store DB password in Secrets Manager, fetch at Lambda cold start
  - Pros: Simple; works with standard DATABASE_URL; minimal code changes; automatic rotation available
  - Cons: Password is long-lived (until rotated)

- **Option B: IAM Authentication**
  - Description: Lambda generates short-lived IAM tokens for each connection
  - Pros: More secure (15-min token lifetime); no passwords; AWS-native
  - Cons: More complex; requires AWS SDK for token generation; adds latency; requires RDS Proxy IAM auth to be enabled

**Rationale for Option A:**
- Application code already expects `DATABASE_URL` - minimal changes required
- Secrets Manager supports automatic password rotation if needed
- Simpler debugging and local development parity
- IAM auth adds complexity without a huge benefit for this use-case

## Rationale

### Evaluation Criteria

- **Security:** Database not exposed to internet; credentials properly managed
- **Cost:** Acceptable monthly spend for production-ready infrastructure
- **Complexity:** Maintainable by small team; debuggable
- **Reliability:** Handles connection pooling; resilient to traffic spikes
- **Development parity:** Local dev experience similar to production

### Cost Analysis

- **RDS db.t4g.micro**: ~$12/month (Free tier eligible for 12 months)
- **RDS Proxy (2 vCPU min)**: ~$22/month (Connection pooling)
- **NAT Gateway**: ~$32/month (Outbound internet for Lambda)
- **Secrets Manager**: ~$0.40/month (DB credentials storage)
- **Lambda**: ~$0/month (Free tier: 1M requests/month)
- **API Gateway**: ~$0/month (Free tier: 1M requests/month)
- **Total**: **~$66/month**

### Accepted Trade-offs 

- **NAT Gateway cost ($32/month):** Accepted for security and simplicity. This is the primary cost driver but eliminates security risks of exposing database infrastructure.
- **RDS Proxy cost ($22/month):** Accepted for reliability. Prevents connection exhaustion which would cause production outages. If using something like Neon DB, their serverless driver leverages websockets with connection pooling - making a proxy useless. It's also a bit cheaper but we'll stick with AWS to consolidate management of infra.
- **DB password auth vs IAM auth:** Accepted simpler approach. Secrets manager key rotations provide sufficient security given our threat model.

## Consequences

### Positive

* **Security:** RDS and RDS Proxy are not internet-accessible
* **Reliability:** Connection pooling prevents database connection exhaustion
* **Simplicity:** Password-based auth works with existing code patterns
* **Standard architecture:** Follows AWS best practices; easy to find documentation and support
* **Future-proof:** Easy to add more external integrations or AWS services

### Negatives

* **Cost:** ~$66/month is significant for a small project (was ~$27 without NAT/Proxy)
* **Cold start latency:** Lambda in VPC adds ~1-2 seconds to cold starts (mitigated by provisioned concurrency if needed)
* **NAT Gateway as single point:** NAT Gateway is regional; single AZ NAT could be a concern (mitigated by AWS's high availability)


## Clerk Authentication Integration

### Why Clerk

- **Option A: Clerk (managed auth)**
  - Description: Third-party authentication service
  - Pros: Zero auth code to write; handles passwords, MFA, social login; hosted UI; JWT-based
  - Cons: More expensive that Cognito; external dependency; requires internet from Lambda

- **Option B: AWS Cognito**
  - Description: AWS-native identity service
  - Pros: AWS-integrated; no external dependency; works within VPC
  - Cons: More complex setup; less polished UI; steeper learning curve

- **Option C: Custom auth**
  - Description: Build our own auth system
  - Pros: Full control; no external dependencies
  - Cons: Significant development time; security risks; password storage; session management

**Rationale for Clerk:**
- **Reduces scope:** Authentication is complex (passwords, reset flows, MFA, session management). Clerk handles all of this out of the box very quickly.
- **Production-ready immediately:** Hosted sign-in/sign-up UI, JWT issuance, user management dashboard
- **Simple integration:** `@clerk/fastify` plugin verifies JWTs with minimal code. Better to focus on business logic instead of auth infrastructure

### How Clerk Works in Our Architecture

1. User visits web app
2. Web app redirects to Clerk hosted sign-in
3. User authenticates with Clerk
4. Clerk issues JWT to web app
5. Web app sends JWT in Authorization header to API
6. Lambda calls Clerk API to verify JWT
7. Lambda extracts userId from verified JWT
8. Lambda uses userId for all database operations