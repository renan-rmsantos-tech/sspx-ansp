import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** Formato: scrypt$<salt-base64>$<hash-base64>. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [algorithm, saltB64, hashB64] = stored.split("$");

  if (algorithm !== "scrypt" || !saltB64 || !hashB64) {
    return false;
  }

  const expected = Buffer.from(hashB64, "base64");

  if (expected.length !== KEY_LENGTH) {
    return false;
  }

  const derived = await scryptAsync(
    password,
    Buffer.from(saltB64, "base64"),
    KEY_LENGTH
  );

  return timingSafeEqual(derived, expected);
}
