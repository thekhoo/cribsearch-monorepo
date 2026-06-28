# 12. App-layer CORS strategy

- Status: Accepted
- Date: 2026-06-28

## Context

The web frontend is deployed to two origins: `https://cribsearch.vercel.app` and
`https://cribsearch.app`. During local development, the frontend runs on
`http://localhost:3000` (Next.js dev server). All three origins make cross-origin
HTTP requests to the API (Express on Lambda behind HTTP API Gateway).

Without CORS configuration, browsers enforce the Same-Origin Policy by blocking
these cross-origin requests at the network layer, preventing the frontend from
communicating with the API.

## Decision

Enforce CORS at the **Express application layer** using the `cors` middleware,
not at the API Gateway `CorsConfiguration` layer.

### Rationale

1. **Consistency across environments:** The same Express app runs both locally
   (`server.ts`) and in Lambda (Lambda handler). One app-layer config covers both
   environments identically.

2. **Local dev does not depend on the gateway:** The Express app running locally
   via `pnpm dev` (`src/server.ts`, no API Gateway) still enforces CORS identically to the
   deployed version. If CORS were configured only at the gateway, local dev would
   require separate handling or would skip CORS enforcement.

3. **Unit-testable:** Supertest can verify CORS headers and preflight logic
   directly against the Express app without mocking the API Gateway.

### Implementation

- Allowed origins come from the `CORS_ALLOWED_ORIGINS` environment variable
  (comma-separated list).
- **Default (when unset):** `http://localhost:3000` — suitable for local dev
  against the Next.js dev server.
- **Production (SAM template):** `https://cribsearch.vercel.app,https://cribsearch.app`
  — the two production origins.
- Only listed origins are reflected in the `Access-Control-Allow-Origin` header.
  No wildcard `*` is used; every allowed origin is explicit.

## Consequences

- **Preflight cost:** Preflight `OPTIONS` requests are handled by Express in the
  Lambda invocation (instead of by the API Gateway). This adds a small invocation
  cost per preflight request. In practice, most browsers cache preflight responses
  for several minutes, so the cost is amortized.

- **Configuration is code + environment:** Adding or removing an allowed origin
  requires either:
  - Changing `CORS_ALLOWED_ORIGINS` in `.env.example` or local `.env` (dev).
  - Updating the SAM template for production.

  This is simpler than configuring the API Gateway, but every deploy must
  explicitly set the env var or rely on a sane default.

- **Explicit and auditable:** All allowed origins are visible in the code
  (`apps/api/src/app.ts`, the middleware setup) and the SAM template. There is no
  "default allow all" risk; origins must be listed.

- **Lambda cold starts:** Initialising the `cors` middleware adds negligible
  overhead (~few ms). The middleware runs on every request, but the origin check
  is a simple string comparison (very fast).
