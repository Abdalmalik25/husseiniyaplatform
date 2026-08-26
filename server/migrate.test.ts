import { describe, expect, it } from "vitest";
import {
  checksumOf,
  classifyStatementError,
  splitMigrationStatements,
} from "./_core/migrate";

describe("splitMigrationStatements", () => {
  it("splits LF-terminated breakpoints", () => {
    const text =
      'CREATE TABLE "a" (id serial);--> statement-breakpoint\nALTER TABLE "b" ADD COLUMN c int;';
    const parts = splitMigrationStatements(text);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("CREATE TABLE");
    expect(parts[1]).toContain("ALTER TABLE");
  });

  it("splits CRLF-terminated breakpoints (Windows)", () => {
    const text =
      'CREATE TABLE "a" (id serial);--> statement-breakpoint\r\nALTER TABLE "b" ADD COLUMN c int;--> statement-breakpoint\r\nDROP TABLE "c";';
    const parts = splitMigrationStatements(text);
    expect(parts).toHaveLength(3);
    expect(parts[2]).toBe('DROP TABLE "c";');
  });

  it("returns a single statement when there is no breakpoint", () => {
    expect(splitMigrationStatements("SELECT 1;")).toEqual(["SELECT 1;"]);
  });

  it("drops empty trailing segments", () => {
    const text = 'CREATE TABLE "a" (id serial);--> statement-breakpoint\n';
    expect(splitMigrationStatements(text)).toHaveLength(1);
  });

  it("survives a migration file with many statements", () => {
    const stmts = Array.from({ length: 500 }, (_, i) => `SELECT ${i};`);
    const text = stmts.join("--> statement-breakpoint\n");
    expect(splitMigrationStatements(text)).toHaveLength(500);
  });
});

describe("classifyStatementError", () => {
  it("classifies duplicate table (42P07) as exists", () => {
    const err = new Error('relation "accounts" already exists (code 42P07)');
    expect(classifyStatementError(err)).toMatchObject({ kind: "exists" });
  });

  it("classifies duplicate object (42710) as exists", () => {
    const err = new Error('index "idx_x" already exists (code 42710)');
    expect(classifyStatementError(err)).toMatchObject({ kind: "exists" });
  });

  it("classifies plain english 'already exists' as exists", () => {
    expect(
      classifyStatementError(new Error("relation already exists"))
    ).toMatchObject({
      kind: "exists",
    });
  });

  it("classifies unique violation (23505) as exists", () => {
    const err = new Error(
      'duplicate key value violates unique constraint "x" (code 23505)'
    );
    expect(classifyStatementError(err)).toMatchObject({ kind: "exists" });
  });

  it("classifies a genuine failure as failed", () => {
    const err = new Error('syntax error at or near "SELEC" (code 42601)');
    expect(classifyStatementError(err)).toMatchObject({ kind: "failed" });
  });

  it("classifies undefined column as failed", () => {
    expect(
      classifyStatementError(
        new Error('column "missing" does not exist (code 42703)')
      )
    ).toMatchObject({ kind: "failed" });
  });

  it("handles non-Error inputs", () => {
    expect(classifyStatementError(undefined)).toMatchObject({ kind: "failed" });
    expect(classifyStatementError("boom")).toMatchObject({ kind: "failed" });
  });
});

describe("checksumOf", () => {
  it("is stable for identical input", () => {
    const text = "CREATE TABLE x (a int);";
    expect(checksumOf(text)).toBe(checksumOf(text));
  });

  it("changes when content changes", () => {
    expect(checksumOf("a;")).not.toBe(checksumOf("a; "));
  });

  it("returns 16 lowercase hex chars", () => {
    expect(checksumOf("anything")).toMatch(/^[0-9a-f]{16}$/);
  });
});
