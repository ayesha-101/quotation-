// Shared "Ref." formatting: base quote number, "-R<n>" once revised, and a
// trailing "-LPO" once the quotation has actually become a purchase order —
// so the reference printed/shown matches what the business calls it at each
// stage (e.g. BMTC-JIH-202608-1396-R1-LPO).
export function formatQuoteRef(q: { quoteNo: string; revision: number; status: string }): string {
  let ref = q.quoteNo;
  if (q.revision > 0) ref += `-R${q.revision}`;
  if (q.status === "CONVERTED_TO_LPO") ref += "-LPO";
  return ref;
}
