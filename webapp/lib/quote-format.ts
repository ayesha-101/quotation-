// Shared "Ref." formatting: base quote number, "-R<n>" once revised, and a
// trailing "-LPO" once the quotation has actually become a purchase order —
// so the reference printed/shown matches what the business calls it at each
// stage (e.g. BMTC-JIH-202608-1396-R1-LPO).
const LPO_STAGES = ["CONVERTED_TO_LPO", "PENDING_INVOICE", "INVOICED"];

export function formatQuoteRef(q: { quoteNo: string; revision: number; status: string }): string {
  let ref = q.quoteNo;
  if (q.revision > 0) ref += `-R${q.revision}`;
  // Once it's become a purchase order it stays one through invoicing, so
  // every downstream stage keeps the "-LPO" the business refers to it by.
  if (LPO_STAGES.includes(q.status)) ref += "-LPO";
  return ref;
}
