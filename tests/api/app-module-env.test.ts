import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Regression guard for a real bug (found 2026-09-24): app.module.ts read
// SUPABASE_ANON_KEY for the SERVER-SIDE Supabase client, silently falling back
// to a dummy key because .env sets SUPABASE_SERVICE_ROLE_KEY instead. The API
// needs the service-role key (it bypasses RLS for backend writes); the anon
// key belongs only in apps/web. This asserts the source, not a mocked call,
// so a future task rewriting app.module.ts can't reintroduce the same typo
// without this test failing loudly.
const appModuleSource = readFileSync(
  fileURLToPath(new URL("../../apps/api/src/app.module.ts", import.meta.url)),
  "utf-8",
);

describe("AppModule Supabase client wiring (NFR-10)", () => {
  it("reads SUPABASE_SERVICE_ROLE_KEY for the server-side client", () => {
    expect(appModuleSource).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("never reads SUPABASE_ANON_KEY in the API (that belongs to apps/web only)", () => {
    expect(appModuleSource).not.toMatch(/SUPABASE_ANON_KEY/);
  });
});
