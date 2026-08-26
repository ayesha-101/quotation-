import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Cryptographically random, easy-to-read temporary password (no ambiguous chars). */
export function generateTempPassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  // Reject bytes that would bias the modulo (256 isn't a multiple of
  // chars.length) instead of just taking `byte % chars.length`, so every
  // character is equally likely.
  const limit = 256 - (256 % chars.length);
  let out = "";
  while (out.length < length) {
    const bytes = randomBytes(length - out.length);
    for (const b of bytes) {
      if (b < limit) out += chars[b % chars.length];
    }
  }
  return out;
}
