/**
 * Runtime configuration derived from environment variables.
 * NEXT_PUBLIC_* variables are inlined at build time by Next.js.
 */

/** Base URL for the Cribsearch API. Trailing slash is stripped for clean URL joins. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);
