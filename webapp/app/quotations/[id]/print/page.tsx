import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { formatQuoteRef } from "@/lib/quote-format";
import PrintButton from "./print-button";

const TERMS_CONDITIONS = [
  "Quoted are Net in AED, for material supply only, based on the quantities mentioned in the BOQ received with your enquiry.",
  "Prices quoted are based on the present rate of government levied taxes. Any change to these will be to your account.",
  "Our prices including the cost of normal packing.",
  "Our special prices mentioned above is valid only for the subject project. Further these prices are subject to reconfirmation, if the quantities are changed.",
  "Our prices not include the expenses for the visit of representative of client/consultant for witnessing test.",
  "Prices quoted are based on current market conditions and are subject to change in the event of fluctuations in raw material costs, manufacturer pricing, currency exchange rates, freight charges, or other external factors beyond our control.",
];

const LABEL_COLOR = "#C00000";
const CELL_BORDER = "1px solid #000";

function FieldRow({
  cells,
}: {
  cells: Array<{ label: string; value?: string | null; colSpan?: number }>;
}) {
  return (
    <tr>
      {cells.map((c, i) => (
        <Fragment key={i}>
          <td
            key={`l${i}`}
            style={{
              border: CELL_BORDER,
              padding: "4px 8px",
              fontWeight: 700,
              color: LABEL_COLOR,
              fontSize: 11,
              whiteSpace: "nowrap",
              width: 1,
            }}
          >
            {c.label}
          </td>
          <td
            key={`v${i}`}
            colSpan={c.colSpan || 1}
            style={{ border: CELL_BORDER, padding: "4px 8px", fontSize: 11.5, color: "#1a2233" }}
          >
            {c.value || " "}
          </td>
        </Fragment>
      ))}
    </tr>
  );
}

export default async function QuotationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");

  const { id } = await params;
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: { lines: { orderBy: { position: "asc" } }, createdBy: true },
  });
  if (!q) notFound();

  const dateStr = q.createdAt
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
    .replace(/ /g, "-");
  const preparedByName = q.prepName || q.createdBy.name;
  const quoteRef = formatQuoteRef(q);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
        .print-doc table, .print-doc th, .print-doc td {
          color: #1a2233;
        }
      `}</style>
      <div style={{ background: "#f0f2f5", minHeight: "100vh", padding: "24px 0" }}>
        <div className="no-print" style={{ maxWidth: 800, margin: "0 auto 16px", display: "flex", gap: 10 }}>
          <PrintButton />
        </div>
        <div
          className="print-doc"
          style={{
            fontFamily: "var(--font-inter), Arial, sans-serif",
            color: "#1a2233",
            maxWidth: 800,
            margin: "0 auto",
            padding: "40px 44px",
            background: "#fff",
            lineHeight: 1.5,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bmtc-logo.png" alt="BMTC" style={{ height: 56, marginBottom: 18 }} />

          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 4 }}>
            <tbody>
              <tr>
                <td
                  colSpan={4}
                  style={{
                    border: CELL_BORDER,
                    padding: "6px 8px",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: 2,
                  }}
                >
                  QUOTATION
                </td>
              </tr>
              <FieldRow cells={[{ label: "To", value: q.to }, { label: "Our Ref .:", value: quoteRef }]} />
              <FieldRow cells={[{ label: "Attention", value: q.attention }, { label: "Date .:", value: dateStr }]} />
              <FieldRow cells={[{ label: "Reference", value: q.reference }, { label: "Tel No .:", value: q.telNo }]} />
              <FieldRow cells={[{ label: "Project", value: q.project }, { label: "Fax No .:", value: q.faxNo }]} />
              <FieldRow cells={[{ label: "Consultant", value: q.consultant }, { label: "Mob No .:", value: q.mobNo }]} />
              <FieldRow cells={[{ label: "Client", value: q.client }, { label: " ", value: "" }]} />
              <FieldRow cells={[{ label: "Subject .:", value: q.subject, colSpan: 3 }]} />
            </tbody>
          </table>

          <div style={{ fontSize: 11.5, color: "#1a2233", margin: "10px 0" }}>
            We thank you for the referred enquiry and are pleased to offer the following quote:
          </div>

          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
            <thead>
              <tr>
                {["S.#.", "Cat. Ref.", "Description", "Brand", "UOM", "Qty.", "U.Price", "Total AED."].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      border: CELL_BORDER,
                      textAlign: i >= 5 ? "right" : "left",
                      padding: "4px 6px",
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.lines.map((l, i) => (
                <tr key={l.id}>
                  <td style={{ border: CELL_BORDER, padding: "6px" }}>{i + 1}</td>
                  <td style={{ border: CELL_BORDER, padding: "6px", fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 10.5 }}>
                    {l.code || "—"}
                  </td>
                  <td style={{ border: CELL_BORDER, padding: "6px" }}>{l.description}</td>
                  <td style={{ border: CELL_BORDER, padding: "6px" }}>{l.brand}</td>
                  <td style={{ border: CELL_BORDER, padding: "6px" }}>{l.uom}</td>
                  <td style={{ border: CELL_BORDER, padding: "6px", textAlign: "right" }}>{l.qty.toLocaleString()}</td>
                  <td style={{ border: CELL_BORDER, padding: "6px", textAlign: "right" }}>{l.unitSell.toFixed(2)}</td>
                  <td style={{ border: CELL_BORDER, padding: "6px", textAlign: "right" }}>{l.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} style={{ border: CELL_BORDER, padding: "5px 6px", textAlign: "right", fontWeight: 700, color: LABEL_COLOR }}>
                  Quote Value AED
                </td>
                <td style={{ border: CELL_BORDER, padding: "5px 6px", textAlign: "right", fontWeight: 700, color: LABEL_COLOR }}>
                  {q.quoteValue.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colSpan={7} style={{ border: CELL_BORDER, padding: "5px 6px", textAlign: "right", fontWeight: 700, color: LABEL_COLOR }}>
                  VAT 5%
                </td>
                <td style={{ border: CELL_BORDER, padding: "5px 6px", textAlign: "right", fontWeight: 700, color: LABEL_COLOR }}>
                  {q.vat.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colSpan={7} style={{ border: CELL_BORDER, padding: "5px 6px", textAlign: "right", fontWeight: 700, color: LABEL_COLOR }}>
                  Total Value AED
                </td>
                <td style={{ border: CELL_BORDER, padding: "5px 6px", textAlign: "right", fontWeight: 700, color: LABEL_COLOR }}>
                  {q.totalValue.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 700, fontSize: 12, marginTop: 20, marginBottom: 6 }}>Terms &amp; Conditions:</div>
          <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>Price Offer:</div>
          <div style={{ fontSize: 10.5, color: "#1a2233", marginBottom: 14 }}>
            {TERMS_CONDITIONS.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                <span style={{ flexShrink: 0 }}>{i + 1}-</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#1a2233", lineHeight: 1.9, marginBottom: 16 }}>
            <div>
              <b style={{ textDecoration: "underline" }}>Currency:</b> Arab Emirates Dirham (AED)
            </div>
            <div>
              <b style={{ textDecoration: "underline" }}>Delivery :</b> {q.delivery || "To be confirmed"}
            </div>
            <div>
              <b style={{ textDecoration: "underline" }}>Delivery Place:</b> {q.deliveryPlace}
            </div>
            <div>
              <b style={{ textDecoration: "underline" }}>Validity:</b> {q.validity}
            </div>
            <div>
              <b style={{ textDecoration: "underline" }}>Payment Terms:</b> {q.paymentTerms || "To be confirmed"}
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#1a2233", marginBottom: 20 }}>
            We look forward to meeting your expectations and to conducting long term business relationship.
            <br />
            Thanking you and assuring you of our best services at all times.
          </div>

          <div style={{ fontSize: 11, marginBottom: 30 }}>
            <div style={{ fontWeight: 700 }}>For AL BAHRI AND AL MAZROEI TRADING COM. LLC</div>
            <div style={{ height: 28 }} />
            <div style={{ fontWeight: 700 }}>{preparedByName}</div>
            <div>{q.prepTitle}</div>
            <div>{q.prepMobile ? `MOBILE: ${q.prepMobile}` : ""}</div>
          </div>

          <div
            style={{
              borderTop: "1px solid #ccc",
              paddingTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 9.5, color: "#333" }}>
              <div style={{ color: "#2962AE", fontWeight: 600 }}>
                شركة البحري والمزروعي التجارية ذ.م.م.-ش.ش.و
              </div>
              <div style={{ color: "#2962AE", fontWeight: 600 }}>
                Al Bahri &amp; Al Mazroei Trading Company L.L.C.- S.P.C
              </div>
              <div style={{ marginTop: 4 }}>P.O. Box 72901, Abu Dhabi, United Arab Emirates</div>
              <div>00971 2 550 6700 &nbsp;|&nbsp; info@bmtc.ae &nbsp;|&nbsp; www.bmtc.ae</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icv-badge.png" alt="In-Country Value Certified — CN-1029315" style={{ height: 50 }} />
          </div>
        </div>
      </div>
    </>
  );
}
