/**
 * Runtime configuration derived from environment variables.
 * NEXT_PUBLIC_* variables are inlined at build time by Next.js.
 */

/** Base URL for the Cribsearch API. Trailing slash is stripped for clean URL joins. */
const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
const hasValue = raw != null && raw.length > 0;

// On a Vercel *production* build the API URL must be baked in, so fail the build
// loudly rather than silently shipping the localhost fallback (which only suits
// local dev). Gated on VERCEL_ENV — set to "production" only by `vercel build
// --prod` — so the CI verify job's plain `next build` (no var, by design) and
// Vercel preview builds are unaffected.
if (!hasValue && process.env.VERCEL_ENV === "production") {
  throw new Error(
    "NEXT_PUBLIC_API_URL is unset or empty in the Vercel production environment. " +
      "Set it to the API Gateway base URL in Vercel → Settings → Environment Variables " +
      "(Production scope), then redeploy.",
  );
}

export const API_BASE_URL = (hasValue ? raw : "http://localhost:3001").replace(/\/$/, "");
