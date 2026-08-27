"use server";

import { requireAdmin } from "@/lib/auth-guard";
import { verifyChainIntegrity, type ChainVerifyResult } from "@/lib/security-chain";

export async function verifyChainAction(): Promise<ChainVerifyResult> {
  await requireAdmin();
  return verifyChainIntegrity();
}
