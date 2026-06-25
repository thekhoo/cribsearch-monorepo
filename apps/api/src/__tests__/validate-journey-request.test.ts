import { describe, it, expect } from "vitest";
import { validateJourneyRequest } from "../services/validate-journey-request";
import type { JourneySearchRequest } from "@cribsearch/shared-types";

const valid: JourneySearchRequest = {
  address: "123 Main St, Sydney",
  modes: ["walk"],
  amenityCategories: ["supermarket"],
  pois: [],
};

describe("validateJourneyRequest", () => {
  it("returns ok for a valid request with amenity categories", () => {
    const result = validateJourneyRequest(valid);
    expect(result).toEqual({ ok: true });
  });

  it("returns ok when pois provided instead of amenity categories", () => {
    const result = validateJourneyRequest({
      ...valid,
      amenityCategories: [],
      pois: [{ label: "Work", address: "456 Office St" }],
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns ok when both amenity categories and pois provided", () => {
    const result = validateJourneyRequest({
      ...valid,
      pois: [{ label: "Work", address: "456 Office St" }],
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns error when address is empty", () => {
    const result = validateJourneyRequest({ ...valid, address: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/address/i);
    }
  });

  it("returns error when address is whitespace-only", () => {
    const result = validateJourneyRequest({ ...valid, address: "   " });
    expect(result.ok).toBe(false);
  });

  it("returns error when modes is empty", () => {
    const result = validateJourneyRequest({ ...valid, modes: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/mode/i);
    }
  });

  it("returns error when neither amenity categories nor pois provided", () => {
    const result = validateJourneyRequest({
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
    const result = validateJourneyRequest({
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
