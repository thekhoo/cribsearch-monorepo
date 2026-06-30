import { describe, it, expect } from "vitest";
import { validatePoiRequest } from "../features/pois/service/validate-poi-request";

const valid = { label: "Work", address: "123 Main St, Sydney" };

describe("validatePoiRequest", () => {
  it("returns ok for a valid request", () => {
    expect(validatePoiRequest(valid)).toEqual({ ok: true });
  });

  it("returns error when label is empty", () => {
    const result = validatePoiRequest({ ...valid, label: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/label/i);
    }
  });

  it("returns error when label is whitespace only", () => {
    const result = validatePoiRequest({ ...valid, label: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/label/i);
    }
  });

  it("returns error when address is empty", () => {
    const result = validatePoiRequest({ ...valid, address: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/address/i);
    }
  });

  it("returns error when address is whitespace only", () => {
    const result = validatePoiRequest({ ...valid, address: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/address/i);
    }
  });

  it("returns combined error when both fields are empty", () => {
    const result = validatePoiRequest({ label: "", address: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/label/i);
      expect(result.error).toMatch(/address/i);
    }
  });
});
