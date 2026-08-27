import crypto from "crypto";
import { prisma } from "./db";

// Append-only hash chain, appended and hashed server-side only — a real
// improvement over the original Artifact's version, which ran entirely in
// the browser and could only prove its own internal consistency, never
// that a client hadn't just regenerated a whole new self-consistent chain.

function maskPII(s: string): string {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, (m) => {
      const at = m.indexOf("@");
      return m.slice(0, 1) + "***" + m.slice(at);
    })
    .replace(/\b\d{7,}\b/g, (m) => m.slice(0, 2) + "*".repeat(m.length - 2));
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

const GENESIS_HASH = "0".repeat(64);
const MAX_RETRIES = 5;

function recordPayload(rec: {
  seq: number;
  at: string;
  actor: string;
  action: string;
  resource: string;
  outcome: string;
  prevHash: string;
}) {
  return JSON.stringify(rec);
}

// Runs in its own Serializable transaction (not nested in the caller's),
// so a concurrent append can never read the same "last record" and fork
// the chain — Postgres aborts one side, and it's retried here. This does
// mean the business action and its chain entry aren't atomic with each
// other (a crash between the two could lose the log entry, not the
// business change) — an accepted trade-off for keeping append-only chain
// contention isolated from every other transaction in the app.
export async function appendChainEvent(params: {
  actor: string;
  action: string;
  resource: string;
  outcome: "success" | "failure";
}): Promise<void> {
  const actor = maskPII(params.actor);
  const action = maskPII(params.action);
  const at = new Date();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const last = await tx.securityChainRecord.findFirst({ orderBy: { seq: "desc" } });
          const prevHash = last?.hash ?? GENESIS_HASH;
          const nextSeq = (last?.seq ?? 0) + 1;
          const hash = sha256Hex(
            recordPayload({
              seq: nextSeq,
              at: at.toISOString(),
              actor,
              action,
              resource: params.resource,
              outcome: params.outcome,
              prevHash,
            })
          );
          await tx.securityChainRecord.create({
            data: { at, actor, action, resource: params.resource, outcome: params.outcome, prevHash, hash },
          });
        },
        { isolationLevel: "Serializable" }
      );
      return;
    } catch (e) {
      if (attempt === MAX_RETRIES - 1) throw e;
    }
  }
}

export interface ChainVerifyResult {
  valid: boolean;
  brokenAt: number | null;
  total: number;
}

export async function verifyChainIntegrity(): Promise<ChainVerifyResult> {
  const chain = await prisma.securityChainRecord.findMany({ orderBy: { seq: "asc" } });
  let prevHash = GENESIS_HASH;
  for (const rec of chain) {
    if (rec.prevHash !== prevHash) return { valid: false, brokenAt: rec.seq, total: chain.length };
    const expected = sha256Hex(
      recordPayload({
        seq: rec.seq,
        at: rec.at.toISOString(),
        actor: rec.actor,
        action: rec.action,
        resource: rec.resource,
        outcome: rec.outcome,
        prevHash: rec.prevHash,
      })
    );
    if (expected !== rec.hash) return { valid: false, brokenAt: rec.seq, total: chain.length };
    prevHash = rec.hash;
  }
  return { valid: true, brokenAt: null, total: chain.length };
}
