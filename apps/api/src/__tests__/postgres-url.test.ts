import { describe, it, expect } from "vitest";
import { buildPostgresUrl } from "../shared/config/postgres-url";
import type { PostgresConfig } from "../shared/config/postgres-url";

describe("buildPostgresUrl", () => {
  const base: PostgresConfig = {
    host: "db.example.com",
    port: 5432,
    user: "admin",
    password: "secret",
    database: "mydb",
  };

  it("builds a basic connection URL with default sslmode=require", () => {
    expect(buildPostgresUrl(base)).toBe(
      "postgresql://admin:secret@db.example.com:5432/mydb?sslmode=require",
    );
  });

  it("URL-encodes special characters in password", () => {
    const config: PostgresConfig = {
      ...base,
      password: "p@ss/w:rd?",
    };
    expect(buildPostgresUrl(config)).toBe(
      "postgresql://admin:p%40ss%2Fw%3Ard%3F@db.example.com:5432/mydb?sslmode=require",
    );
  });

  it("URL-encodes special characters in user", () => {
    const config: PostgresConfig = {
      ...base,
      user: "user@org",
    };
    expect(buildPostgresUrl(config)).toBe(
      "postgresql://user%40org:secret@db.example.com:5432/mydb?sslmode=require",
    );
  });

  it("URL-encodes special characters in database name", () => {
    const config: PostgresConfig = {
      ...base,
      database: "my/db#1",
    };
    expect(buildPostgresUrl(config)).toBe(
      "postgresql://admin:secret@db.example.com:5432/my%2Fdb%231?sslmode=require",
    );
  });

  it("applies a custom sslmode when provided", () => {
    const config: PostgresConfig = {
      ...base,
      sslmode: "disable",
    };
    expect(buildPostgresUrl(config)).toBe(
      "postgresql://admin:secret@db.example.com:5432/mydb?sslmode=disable",
    );
  });

  it("includes the correct port", () => {
    const config: PostgresConfig = {
      ...base,
      port: 6543,
    };
    expect(buildPostgresUrl(config)).toBe(
      "postgresql://admin:secret@db.example.com:6543/mydb?sslmode=require",
    );
  });

  it("does not encode the host", () => {
    const config: PostgresConfig = {
      ...base,
      host: "my-host.region-1.rds.amazonaws.com",
    };
    expect(buildPostgresUrl(config)).toBe(
      "postgresql://admin:secret@my-host.region-1.rds.amazonaws.com:5432/mydb?sslmode=require",
    );
  });
});
