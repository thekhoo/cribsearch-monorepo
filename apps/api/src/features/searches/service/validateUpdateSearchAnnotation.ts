import type { PropertyDetails, Price, PricePeriod } from "@cribsearch/shared-types";

type AnnotationValue = {
  searchName?: string | null;
  propertyDetails?: PropertyDetails;
};

export type AnnotationValidationResult =
  | { ok: true; value: AnnotationValue }
  | { ok: false; error: string };

const VALID_PERIODS: ReadonlySet<string> = new Set<PricePeriod>(["pd", "pw", "pcm", "pa"]);

const validatePrice = (raw: Record<string, unknown>): { ok: true; value: Price } | { ok: false; error: string } => {
  const price: Price = {};

  if ("amount" in raw) {
    const a = raw["amount"];
    if (typeof a !== "number" || !isFinite(a) || a <= 0) {
      return { ok: false, error: "propertyDetails.price.amount must be a finite number greater than 0" };
    }
    price.amount = a;
  }

  if ("currency" in raw) {
    const c = raw["currency"];
    if (typeof c !== "string" || !/^[a-zA-Z]{3}$/.test(c)) {
      return { ok: false, error: "propertyDetails.price.currency must be a 3-letter alphabetic code" };
    }
    price.currency = c.toUpperCase();
  }

  if ("period" in raw) {
    const p = raw["period"];
    if (typeof p !== "string" || !VALID_PERIODS.has(p)) {
      return { ok: false, error: "propertyDetails.price.period must be one of pd, pw, pcm, pa" };
    }
    price.period = p as PricePeriod;
  }

  return { ok: true, value: price };
};

const validatePropertyDetails = (raw: Record<string, unknown>): { ok: true; value: PropertyDetails } | { ok: false; error: string } => {
  const pd: PropertyDetails = {};

  if ("price" in raw) {
    const rawPrice = raw["price"];
    if (rawPrice === null || typeof rawPrice !== "object" || Array.isArray(rawPrice)) {
      return { ok: false, error: "propertyDetails.price must be an object" };
    }
    const priceResult = validatePrice(rawPrice as Record<string, unknown>);
    if (!priceResult.ok) return priceResult;
    if (Object.keys(priceResult.value).length > 0) {
      pd.price = priceResult.value;
    }
  }

  if ("description" in raw) {
    const d = raw["description"];
    if (typeof d !== "string") {
      return { ok: false, error: "propertyDetails.description must be a string" };
    }
    const trimmed = d.trim();
    if (trimmed !== "") {
      pd.description = trimmed;
    }
  }

  if ("listingUrl" in raw) {
    const u = raw["listingUrl"];
    if (typeof u !== "string") {
      return { ok: false, error: "propertyDetails.listingUrl must be a string" };
    }
    const trimmed = u.trim();
    if (trimmed !== "") {
      // Auto-prefix https:// when no scheme is present
      const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
      let parsed: URL;
      try {
        parsed = new URL(withScheme);
      } catch {
        return { ok: false, error: "propertyDetails.listingUrl is not a valid URL" };
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { ok: false, error: "propertyDetails.listingUrl must use http or https protocol" };
      }
      pd.listingUrl = parsed.href;
    }
  }

  return { ok: true, value: pd };
};

export const validateUpdateSearchAnnotation = (body: unknown): AnnotationValidationResult => {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "body must be an object" };
  }

  const raw = body as Record<string, unknown>;
  const value: AnnotationValue = {};

  if ("searchName" in raw) {
    const rawName = raw["searchName"];
    if (rawName !== null && typeof rawName !== "string") {
      return { ok: false, error: "searchName must be a string or null" };
    }
    if (rawName === null) {
      value.searchName = null;
    } else {
      const trimmed = rawName.trim();
      value.searchName = trimmed === "" ? null : trimmed;
    }
  }

  if ("propertyDetails" in raw) {
    const rawPd = raw["propertyDetails"];
    if (rawPd === null || typeof rawPd !== "object" || Array.isArray(rawPd)) {
      return { ok: false, error: "propertyDetails must be an object" };
    }
    const pdResult = validatePropertyDetails(rawPd as Record<string, unknown>);
    if (!pdResult.ok) return pdResult;
    value.propertyDetails = pdResult.value;
  }

  return { ok: true, value };
};
