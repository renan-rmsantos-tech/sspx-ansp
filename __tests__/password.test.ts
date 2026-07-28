import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword", () => {
  it("produces a scrypt hash with an embedded salt", async () => {
    const hash = await hashPassword("senha-secreta");
    const [algorithm, salt, digest] = hash.split("$");

    expect(algorithm).toBe("scrypt");
    expect(salt.length).toBeGreaterThan(0);
    expect(digest.length).toBeGreaterThan(0);
  });

  it("never stores the password itself", async () => {
    const hash = await hashPassword("senha-secreta");

    expect(hash).not.toContain("senha-secreta");
  });

  it("salts each hash, so equal passwords differ", async () => {
    const first = await hashPassword("mesma-senha");
    const second = await hashPassword("mesma-senha");

    expect(first).not.toBe(second);
  });
});

describe("verifyPassword", () => {
  it("accepts the correct password", async () => {
    const hash = await hashPassword("senha-secreta");

    expect(await verifyPassword("senha-secreta", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("senha-secreta");

    expect(await verifyPassword("outra-senha", hash)).toBe(false);
  });

  it("rejects an empty password", async () => {
    const hash = await hashPassword("senha-secreta");

    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    for (const stored of ["", "não-é-um-hash", "scrypt$só-o-salt", "md5$a$b"]) {
      expect(await verifyPassword("qualquer", stored)).toBe(false);
    }
  });
});
