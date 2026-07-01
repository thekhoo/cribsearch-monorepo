import type { SearchRequest } from "@cribsearch/shared-types";

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export const validateSearchRequest = (
  req: SearchRequest,
): ValidationResult => {
  const errors: string[] = [];

  if (!req.address.trim()) {
    errors.push("address is required");
  }

  if (req.modes.length < 1) {
    errors.push("at least one transport mode is required");
  }

  if (req.amenityCategories.length < 1 && req.pois.length < 1) {
    errors.push(
      "at least one amenity category or POI destination is required",
    );
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join("; ") };
  }

  return { ok: true };
};
