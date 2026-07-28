import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const envExample = fs.readFileSync(
  path.resolve(__dirname, "../.env.example"),
  "utf-8"
);

describe(".env.example", () => {
  it("documents every variable the application reads", () => {
    for (const name of [
      "DATABASE_URL",
      "SESSION_SECRET",
      "STORAGE_DIR",
      "ADMIN_EMAIL",
      "ADMIN_PASSWORD",
      "AUTH_BYPASS",
    ]) {
      expect(envExample).toContain(name);
    }
  });

  it("no longer references Supabase", () => {
    expect(envExample).not.toMatch(/supabase/i);
  });

  it("ships a placeholder secret rather than a real one", () => {
    const secret = envExample.match(/^SESSION_SECRET=(.*)$/m)?.[1] ?? "";

    expect(secret).toMatch(/troque/i);
  });
});
