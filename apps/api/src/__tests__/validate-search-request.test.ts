import { describe, it, expect } from "vitest";
import { validateSearchRequest } from "../features/searches/service/validate-search-request";
import type { SearchRequest } from "@cribsearch/shared-types";

const valid: SearchRequest = {
  address: "123 Main St, Sydney",
  modes: ["walk"],
  amenityCategories: ["supermarket"],
  pois: [],
};

describe("validateSearchRequest", () => {
  it("returns ok for a valid request with amenity categories", () => {
    const result = validateSearchRequest(valid);
    expect(result).toEqual({ ok: true });
  });

  it("returns ok when pois provided instead of amenity categories", () => {
    const result = validateSearchRequest({
      ...valid,
      amenityCategories: [],
      pois: [{ label: "Work", address: "456 Office St" }],
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns ok when both amenity categories and pois provided", () => {
    const result = validateSearchRequest({
      ...valid,
      pois: [{ label: "Work", address: "456 Office St" }],
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns error when address is empty", () => {
    const result = validateSearchRequest({ ...valid, address: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/address/i);
    }
  });

  it("returns error when address is whitespace-only", () => {
    const result = validateSearchRequest({ ...valid, address: "   " });
    expect(result.ok).toBe(false);
  });

  it("returns error when modes is empty", () => {
    const result = validateSearchRequest({ ...valid, modes: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/mode/i);
    }
  });

  it("returns error when neither amenity categories nor pois provided", () => {
    const result = validateSearchRequest({
      ...valid,
      amenityCategories: [],
      pois: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/amenity|poi|destination/i);
    }
  });

  it("returns combined error when multiple fields are invalid", () => {
    const result = validateSearchRequest({
      address: "",
      modes: [],
      amenityCategories: [],
      pois: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/address/i);
      expect(result.error).toMatch(/mode/i);
    }
  });
});
