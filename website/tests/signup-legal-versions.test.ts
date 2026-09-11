import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { LEGAL_DOCUMENTS } from "../lib/legal.ts";

test("signup legal versions are registered with the exact immutable archive content", () => {
  const migrationsRoot = new URL("../../supabase/migrations/", import.meta.url);
  const migration = readdirSync(migrationsRoot).filter(name => name.endsWith(".sql"))
    .map(name => readFileSync(new URL(name, migrationsRoot), "utf8")).join("\n");
  for (const document of Object.values(LEGAL_DOCUMENTS)) {
    const archive = readFileSync(new URL(`../public${document.archiveFilePath}`, import.meta.url), "utf8").replace(/\r\n?/g, "\n");
    const hash = createHash("sha256").update(archive).digest("hex");
    assert.ok(migration.includes(`('${document.key}', '${document.version}', '${document.effectiveDate}', '${hash}', '${document.archivePath}')`), `${document.key}: signup version must be registered before it can be recorded`);
  }
});
