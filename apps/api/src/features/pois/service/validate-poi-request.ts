export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export interface PoiRequestFields {
  label: string;
  address: string;
}

export const validatePoiRequest = (req: PoiRequestFields): ValidationResult => {
  const errors: string[] = [];

  if (!req.label || !req.label.trim()) {
    errors.push("label is required");
  }

  if (!req.address || !req.address.trim()) {
    errors.push("address is required");
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join("; ") };
  }

  return { ok: true };
};
