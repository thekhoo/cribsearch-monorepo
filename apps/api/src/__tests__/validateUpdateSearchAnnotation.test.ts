import { describe, it, expect } from "vitest";
import { validateUpdateSearchAnnotation } from "../features/searches/service/validateUpdateSearchAnnotation";

describe("validateUpdateSearchAnnotation", () => {
  // ── Body shape ──────────────────────────────────────────────────────────────

  it("returns ok for an empty body object", () => {
    const result = validateUpdateSearchAnnotation({});
    expect(result).toEqual({ ok: true, value: {} });
  });

  it("rejects null body", () => {
    const result = validateUpdateSearchAnnotation(null);
    expect(result.ok).toBe(false);
  });

  it("rejects array body", () => {
    const result = validateUpdateSearchAnnotation([]);
    expect(result.ok).toBe(false);
  });

  it("rejects string body", () => {
    const result = validateUpdateSearchAnnotation("hello");
    expect(result.ok).toBe(false);
  });

  // ── searchName ───────────────────────────────────────────────────────────────

  it("trims searchName whitespace", () => {
    const result = validateUpdateSearchAnnotation({ searchName: "  My House  " });
    expect(result).toEqual({ ok: true, value: { searchName: "My House" } });
  });

  it("normalises empty string searchName to null", () => {
    const result = validateUpdateSearchAnnotation({ searchName: "" });
    expect(result).toEqual({ ok: true, value: { searchName: null } });
  });

  it("normalises whitespace-only searchName to null", () => {
    const result = validateUpdateSearchAnnotation({ searchName: "   " });
    expect(result).toEqual({ ok: true, value: { searchName: null } });
  });

  it("accepts explicit null searchName", () => {
    const result = validateUpdateSearchAnnotation({ searchName: null });
    expect(result).toEqual({ ok: true, value: { searchName: null } });
  });

  it("rejects non-string searchName", () => {
    const result = validateUpdateSearchAnnotation({ searchName: 42 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/searchName/i);
  });

  // ── propertyDetails ─────────────────────────────────────────────────────────

  it("rejects null propertyDetails", () => {
    const result = validateUpdateSearchAnnotation({ propertyDetails: null });
    expect(result.ok).toBe(false);
  });

  it("rejects array propertyDetails", () => {
    const result = validateUpdateSearchAnnotation({ propertyDetails: [] });
    expect(result.ok).toBe(false);
  });

  it("accepts empty propertyDetails object", () => {
    const result = validateUpdateSearchAnnotation({ propertyDetails: {} });
    expect(result).toEqual({ ok: true, value: { propertyDetails: {} } });
  });

  // ── price.amount ─────────────────────────────────────────────────────────────

  it("rejects amount of 0", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { amount: 0 } },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/amount/i);
  });

  it("rejects negative amount", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { amount: -5 } },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects NaN amount", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { amount: NaN } },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects Infinity amount", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { amount: Infinity } },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-number amount", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { amount: "1500" } },
    });
    expect(result.ok).toBe(false);
  });

  it("accepts valid positive amount", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { amount: 1500 } },
    });
    expect(result).toEqual({ ok: true, value: { propertyDetails: { price: { amount: 1500 } } } });
  });

  // ── price.currency ────────────────────────────────────────────────────────────

  it("uppercases lowercase currency code", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { currency: "eur" } },
    });
    expect(result).toEqual({ ok: true, value: { propertyDetails: { price: { currency: "EUR" } } } });
  });

  it("passes through already-uppercase currency code", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { currency: "GBP" } },
    });
    expect(result).toEqual({ ok: true, value: { propertyDetails: { price: { currency: "GBP" } } } });
  });

  it("rejects non-3-letter currency code", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { currency: "EU" } },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/currency/i);
  });

  it("rejects currency with digits", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { currency: "E1R" } },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-string currency", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { currency: 978 } },
    });
    expect(result.ok).toBe(false);
  });

  // ── price.period ─────────────────────────────────────────────────────────────

  it("accepts all valid periods", () => {
    for (const period of ["pd", "pw", "pcm", "pa"] as const) {
      const result = validateUpdateSearchAnnotation({
        propertyDetails: { price: { period } },
      });
      expect(result).toEqual({ ok: true, value: { propertyDetails: { price: { period } } } });
    }
  });

  it("rejects invalid period", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: { period: "pyr" } },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/period/i);
  });

  // ── price: empty after normalisation → price dropped ─────────────────────────

  it("drops price key when all price sub-fields are absent", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { price: {} },
    });
    // price object is empty so price should be omitted from the result
    expect(result).toEqual({ ok: true, value: { propertyDetails: {} } });
  });

  // ── propertyDetails.description ──────────────────────────────────────────────

  it("trims description", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { description: "  Nice flat  " },
    });
    expect(result).toEqual({ ok: true, value: { propertyDetails: { description: "Nice flat" } } });
  });

  it("drops blank description", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { description: "   " },
    });
    expect(result).toEqual({ ok: true, value: { propertyDetails: {} } });
  });

  it("rejects non-string description", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { description: 42 },
    });
    expect(result.ok).toBe(false);
  });

  // ── propertyDetails.listingUrl ────────────────────────────────────────────────

  it("auto-prefixes bare domain with https://", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { listingUrl: "example.com/property/123" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.propertyDetails?.listingUrl).toBe("https://example.com/property/123");
    }
  });

  it("preserves existing https:// scheme and returns normalised href", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { listingUrl: "https://example.com/property/123" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.propertyDetails?.listingUrl).toBe("https://example.com/property/123");
    }
  });

  it("accepts http:// scheme", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { listingUrl: "http://example.com/listing" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.propertyDetails?.listingUrl).toMatch(/^http:\/\//);
    }
  });

  it("rejects ftp:// scheme", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { listingUrl: "ftp://example.com/file" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/http|https|protocol/i);
  });

  it("rejects an invalid URL string", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { listingUrl: "not a url at all !!!" },
    });
    expect(result.ok).toBe(false);
  });

  it("drops blank listingUrl", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { listingUrl: "   " },
    });
    expect(result).toEqual({ ok: true, value: { propertyDetails: {} } });
  });

  it("rejects non-string listingUrl", () => {
    const result = validateUpdateSearchAnnotation({
      propertyDetails: { listingUrl: 123 },
    });
    expect(result.ok).toBe(false);
  });

  // ── Combined fields ───────────────────────────────────────────────────────────

  it("accepts all fields together", () => {
    const result = validateUpdateSearchAnnotation({
      searchName: " My Home ",
      propertyDetails: {
        price: { amount: 1200, currency: "eur", period: "pcm" },
        description: "  Cosy flat  ",
        listingUrl: "example.com/listing",
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.searchName).toBe("My Home");
      expect(result.value.propertyDetails?.price).toEqual({ amount: 1200, currency: "EUR", period: "pcm" });
      expect(result.value.propertyDetails?.description).toBe("Cosy flat");
      expect(result.value.propertyDetails?.listingUrl).toBe("https://example.com/listing");
    }
  });
});
