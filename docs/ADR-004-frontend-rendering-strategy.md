# ADR-004 - Frontend Rendering Strategy
_Client-Side Rendering vs Server-Side Rendering_

## Context

Our UI needs to be deployed to AWS. We intend to use Tanstack start with React 19 which supports both SSR and CSR. NextJS was avoided in favor of a separated UI and API.

What we need to decide on is the rendering strategy because it determines:

1. **Infrastructure requirements** — SSR needs compute (Lambda), CSR needs only static hosting (S3)
2. **Deployment complexity** — SSR requires Lambdas; CSR is simple static files
3. **Cost** — SSR has compute costs; CSR is nearly free via s3 + cloudfront
4. **User experience** — SSR has no flashing UI during auth process; CSR may show brief loading state

## Decision

We will use CSR with static hosting on S3 + Cloudfront.

The frontend will be a pure static React application:
- Built with Vite + TanStack in SPA mode
- Clerk authentication handled client-side via `@clerk/clerk-react`
- Deployed as static files to S3 with Cloudfront CDN
- API calls made directly to the existing Fastify Lambda API

Architecture Flow:

1. User's browser hits Cloudfront with CDN + edge caching
2. Cloudfront communicates with an S3 Bucket (static files: HTML, JS, CSS)
3. React app loads and Clerk client-side SDK initializes
4. API calls are made to Lambda via API Gateway w/ Clerk JWT

## Alternatives Considered

### Rendering Strategy

1. **Option A: CSR with S3 + Cloudfront**
   - Description: Static React app, client-side Clerk auth
   - Pros: Simplest infrastructure; lowest cost (~$1-5/month); no cold starts; excellent caching; fast globally
   - Cons: Brief auth loading state (~100-200ms); no SSR SEO benefits

2. **Option B: SSR with Lambda@Edge**
   - Description: TanStack Start SSR at CloudFront edge
   - Pros: Auth state on first render; SSR SEO; server functions
   - Cons: Complex deployment; higher cost (~$15-30/month); cold starts at edge; debugging difficulty

3. **Option C: SSR with Lambda**
   - Description: TanStack Start SSR via single Lambda
   - Pros: Simpler than Edge; centralized logs
   - Cons: Higher latency (not at edge); Lambda cold starts (~500ms-2s); adds compute cost

4. **Option D: SSR with ECS Fargate**
   - Description: Container-based SSR server
   - Pros: Always-warm (no cold starts); traditional deployment model
   - Cons: Significantly higher cost (~$30-50/month); over-engineered for app size

**Rationale for Option A:**
- The medication manager is entirely behind authentication — no public pages need SEO
- A brief loading spinner while Clerk initializes is acceptable UX
- Static hosting is dramatically simpler to deploy, debug, and maintain
- CloudFront provides global edge caching with excellent performance
- Cost difference is significant: ~$1-5/month vs ~$15-50/month

### Authentication Approach

1. **Option A: Client-side Clerk SDK**
   - Description: `@clerk/clerk-react` with `useAuth()` hook
   - Pros: Simple; no server functions needed; Clerk handles session via cookies
   - Cons: Auth state available after hydration (~100-200ms delay)

2. **Option B: Server-side Clerk auth**
   - Description: `@clerk/tanstack-react-start/server` with `auth()`
   - Pros: Auth state on first render; no flash
   - Cons: Requires server (Lambda); adds infrastructure complexity

**Rationale for Option A:**
- Clerk's React SDK is mature and handles all session management
- The "auth flash" (loading state while checking auth) is ~100-200ms — barely noticeable with a proper loading UI
- No server infrastructure means no cold starts, no additional compute costs and less debugging across systems

### Static Hosting Options

1. **Option A: S3 + CloudFront**
   - Description: AWS-native static hosting with CDN
   - Pros: Integrates with existing AWS infra; CDK support; global edge caching; ~$1-5/month
   - Cons: Requires CloudFront configuration for SPA routing

2. **Option B: AWS Amplify Hosting**
   - Description: Managed static hosting
   - Pros: Simpler setup; automatic CI/CD; preview deployments
   - Cons: Less control; separate from CDK stack; vendor lock-in to Amplify

3. **Option C: Vercel**
   - Description: Third-party hosting platform
   - Pros: Incredible DX; automatic deployments; edge functions if needed
   - Cons: External dependency; separate billing; not AWS-native

**Rationale for Option A:**
- Keeps all infrastructure in AWS, managed by CDK alongside existing resources
- Full control over Cloudfront behaviors, caching rules and custom domains
- No additional vendor relationships or billing
- Cost-effective and well-documented

### Why CSR?

1. **No public pages** — The entire app is behind Clerk authentication. There are no landing pages, marketing pages or content that needs to be crawled by search engines. SSR's SEO benefits are irrelevant.

2. **Auth flash is acceptable** — Users will see a loading spinner for ~100-200ms while Clerk's SDK initializes and checks their session. For a productivity app used daily by caregivers, this is probably not all that important. The trade-off for simpler infrastructure is worth it.

3. **API is already separate** — All data fetching goes through the Fastify API. We're not doing server-side data fetching in the frontend anyway — the React app makes API calls. SSR wouldn't change this architecture. Also, server components and functions are not worth the risk/reward imo! Best to minimize attack vector surface area as demonstrated by the recent React CVEs.

4. **Cost matters** — NAT Gateway ($32) + RDS Proxy ($22) already costs ~$54/month for the backend. Adding Lambda SSR would increase costs further. S3 + CloudFront adds ~$1-5/month.

5. **Operational simplicity** — Static files on S3 are trivial to deploy, version, rollback and debug. SSR adds Lambda logs, cold start monitoring and tracing complexity.


## Consequences

- **Auth loading flash** — Users see loading state for ~100-200ms on initial page load
- **Client-side routing** — Cloudfront must be configured to handle SPA fallback routing
- **No server functions** — Cannot use TanStack Start's `createServerFn` for server-side logic (not needed since API is separate and probably best to avoid anyways in light of recent CVEs)

## Additional Notes

### Cost Estimate

- **S3 Storage**: ~$0.02/month — ~1MB static files
- **S3 Requests**: ~$0.01/month — GET requests for assets
- **CloudFront Data Transfer**: ~$1-5/month — Depends on traffic
- **CloudFront Requests**: ~$0.01/month — 10K requests = $0.01
- **Total**: ~$1-5/month

Compared to SSR Lambda:
- Lambda invocations: ~$5-15/month
- Lambda@Edge: ~$10-30/month (higher per-request cost)
