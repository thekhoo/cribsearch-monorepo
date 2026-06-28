import { describe, it, expect } from "vitest";
import { parseAllowedOrigins } from "../shared/config/env";

describe("parseAllowedOrigins", () => {
  it("returns [] when var is unset in production (fail closed)", () => {
    expect(parseAllowedOrigins(undefined, "production")).toEqual([]);
  });

  it("returns localhost default when var is unset in development", () => {
    expect(parseAllowedOrigins(undefined, "development")).toEqual(["http://localhost:3000"]);
  });

  it("returns trimmed origins for a non-empty var regardless of environment", () => {
    const origins = "https://a.com, https://b.com";
    expect(parseAllowedOrigins(origins, "production")).toEqual(["https://a.com", "https://b.com"]);
    expect(parseAllowedOrigins(origins, "development")).toEqual(["https://a.com", "https://b.com"]);
  });

  it("returns [] for a whitespace/empty-only var in production (fail closed)", () => {
    expect(parseAllowedOrigins(" , ", "production")).toEqual([]);
  });
});
