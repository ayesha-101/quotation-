import { randomBytes, createHash } from "crypto";

const TOKEN_TTL_MINUTES = 30;

/** Raw token goes in the emailed link; only its hash is ever stored. */
export function generateResetToken() {
  const raw = randomBytes(32).toString("hex");
  return { raw, tokenHash: hashResetToken(raw), expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000) };
}

export function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
