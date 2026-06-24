import { describe, it, expect } from "vitest";
import { createApp } from "../app";

describe("createApp", () => {
  it("returns a callable express application", () => {
    const app = createApp();
    expect(typeof app).toBe("function");
  });
});
