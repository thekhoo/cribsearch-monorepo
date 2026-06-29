/**
 * Runtime configuration derived from environment variables.
 * NEXT_PUBLIC_* variables are inlined at build time by Next.js.
 */

/** Base URL for the Cribsearch API. Trailing slash is stripped for clean URL joins. */
const raw = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (raw && raw.length > 0 ? raw : "http://localhost:3001").replace(
  /\/$/,
  "",
);
