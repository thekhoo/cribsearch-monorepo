/**
 * Unit tests for env-driven CORS middleware.
 *
 * env.ts captures process.env values at module initialization time (not via
 * getters), so we must use vi.stubEnv + vi.resetModules() and then
 * dynamically import app.ts to ensure the fresh module sees the configured
 * origins.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

describe("CORS middleware", () => {
  let app: Express;

  beforeAll(async () => {
    vi.stubEnv("CORS_ALLOWED_ORIGINS", "https://cribsearch.vercel.app,https://cribsearch.app");
    vi.resetModules();
    const { createApp } = await import("../app");
    app = createApp();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reflects allowed origin in an OPTIONS preflight response", async () => {
    const res = await request(app)
      .options("/cribsearch/v1/searches")
      .set("Origin", "https://cribsearch.app")
      .set("Access-Control-Request-Method", "POST");

    expect(res.headers["access-control-allow-origin"]).toBe("https://cribsearch.app");
  });

  it("does not reflect a disallowed origin in the response", async () => {
    const res = await request(app)
      .get("/cribsearch/v1/health")
      .set("Origin", "https://evil.example.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
