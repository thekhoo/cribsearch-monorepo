import { Writable } from "node:stream";
import winston from "winston";
import { describe, expect, it } from "vitest";
import { createLogger } from "../index";

/** Builds a logger whose output is captured as JSON strings. */
const capture = () => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(String(chunk));
      cb();
    },
  });
  const logger = createLogger({ component: "test" });
  logger.clear(); // drop the (silent) console transport
  logger.add(new winston.transports.Stream({ stream }));
  return { logger, lines };
};

const flush = () => new Promise((r) => setImmediate(r));

describe("logger", () => {
  it("emits valid JSON with level, message and bindings", async () => {
    const { logger, lines } = capture();
    logger.info("hello", { journeyRequestId: "abc" });
    await flush();
    const entry = JSON.parse(lines[0] ?? "{}");
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("hello");
    expect(entry.component).toBe("test");
    expect(entry.journeyRequestId).toBe("abc");
    expect(entry.timestamp).toBeTruthy();
  });

  it("merges child bindings onto every line", async () => {
    const { logger, lines } = capture();
    logger.child({ journeyRequestId: "xyz" }).warn("oops");
    await flush();
    const entry = JSON.parse(lines[0] ?? "{}");
    expect(entry.journeyRequestId).toBe("xyz");
    expect(entry.level).toBe("warn");
  });

  it("redacts sensitive keys, including nested ones", async () => {
    const { logger, lines } = capture();
    logger.info("config", {
      supabaseServiceRoleKey: "secret",
      nested: { token: "t" },
      safe: "ok",
    });
    await flush();
    const entry = JSON.parse(lines[0] ?? "{}");
    expect(entry.supabaseServiceRoleKey).toBe("[REDACTED]");
    expect(entry.nested.token).toBe("[REDACTED]");
    expect(entry.safe).toBe("ok");
  });

  it("respects the logger level", async () => {
    const { logger, lines } = capture();
    logger.level = "warn";
    logger.info("dropped");
    logger.warn("kept");
    await flush();
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "{}").message).toBe("kept");
  });
});
