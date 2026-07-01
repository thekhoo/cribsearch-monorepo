import type { ApiError } from "@cribsearch/shared-types";

/** Ensure the request carries an x-user-id. Responds 400 and returns null when absent. */
export const requireUserId = (
  req: { userId?: string },
  res: { status: (n: number) => { json: (b: unknown) => void } },
): string | null => {
  if (!req.userId || !req.userId.trim()) {
    const body: ApiError = { error: "user is required" };
    res.status(400).json(body);
    return null;
  }
  return req.userId;
};
