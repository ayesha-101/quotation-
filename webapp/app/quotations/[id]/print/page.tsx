import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import PrintButton from "./print-button";

const TERMS_CONDITIONS = [
  "Quoted are Net in AED, for material supply only, based on the quantities mentioned in the BOQ received with your enquiry.",
  "Prices quoted are based on the present rate of government levied taxes. Any change to these will be to your account.",
  "Our prices including the cost of normal packing.",
  "Our special prices mentioned above is valid only for the subject project. Further these prices are subject to reconfirmation, if the quantities are changed.",
  "Our prices not include the expenses for the visit of representative of client/consultant for witnessing test.",
  "Prices quoted are based on current market conditions and are subject to change in the event of fluctuations in raw material costs, manufacturer pricing, currency exchange rates, freight charges, or other external factors beyond our control.",
];

function QField({ label, value, span }: { label: string; value?: string | null; span?: number }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, color: "#8a96a3", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 12.5, color: "#1a2233" }}>{value || " "}</div>
    </div>
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

  const dateStr = q.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, "-");
  const preparedByName = q.prepName || q.createdBy.name;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
      <div style={{ background: "#f0f2f5", minHeight: "100vh", padding: "24px 0" }}>
        <div className="no-print" style={{ maxWidth: 800, margin: "0 auto 16px", display: "flex", gap: 10 }}>
          <PrintButton />
        </div>
        <div
          style={{
            fontFamily: "var(--font-inter), Arial, sans-serif",
            color: "#1a2233",
            maxWidth: 800,
            margin: "0 auto",
            padding: "48px 44px",
            background: "#fff",
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderBottom: "3px solid #2e86de",
              paddingBottom: 18,
              marginBottom: 28,
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 24, fontWeight: 700, color: "#0b1524", letterSpacing: 0.3 }}>
                BMTC
              </div>
              <div style={{ fontSize: 10.5, color: "#6b7785", letterSpacing: 0.4, marginTop: 2 }}>
                Al Bahri &amp; Al Mazroei Trading Co. — Electrical Solutions
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 19, fontWeight: 700, color: "#2e86de", letterSpacing: 2 }}>
                QUOTATION
              </div>
              <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 11, color: "#6b7785", marginTop: 3 }}>
                {q.quoteNo}
                {q.revision > 0 ? `-R${q.revision}` : ""}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px 20px", marginBottom: 28 }}>
            <QField label="To" value={q.to} span={2} />
            <QField label="Date" value={dateStr} />
            <QField label="Our Ref." value={q.quoteNo} />
            <QField label="Attention" value={q.attention} />
            <QField label="Tel No." value={q.telNo} />
            <QField label="Reference" value={q.reference} />
            <QField label="Fax No." value={q.faxNo} />
            <QField label="Project" value={q.project} span={2} />
            <QField label="Mob No." value={q.mobNo} />
            <QField label="Consultant" value={q.consultant} />
            <QField label="Client" value={q.client} />
            <QField label="Subject" value={q.subject} span={4} />
          </div>

          <div style={{ fontSize: 12.5, color: "#4a5568", marginBottom: 14 }}>
            We thank you for the referred enquiry and are pleased to offer the following quote:
          </div>

          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, marginBottom: 4 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #0b1524" }}>
                {["#", "Cat. Ref.", "Description", "Brand", "UOM", "Qty", "U.Price", "Total AED"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      textAlign: i >= 5 ? "right" : i === 4 ? "center" : "left",
                      padding: "0 6px 8px",
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      color: "#8a96a3",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.lines.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: "1px solid #eef1f5" }}>
                  <td style={{ padding: "10px 6px", color: "#8a96a3", fontSize: 11.5 }}>{i + 1}</td>
                  <td style={{ padding: "10px 6px", fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 11, color: "#4a5568" }}>
                    {l.code || "—"}
                  </td>
                  <td style={{ padding: "10px 6px" }}>{l.description}</td>
                  <td style={{ padding: "10px 6px", color: "#4a5568" }}>{l.brand}</td>
                  <td style={{ padding: "10px 6px", textAlign: "center", color: "#4a5568" }}>{l.uom}</td>
                  <td style={{ padding: "10px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {l.qty.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {l.unitSell.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {l.lineTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", margin: "18px 0 30px" }}>
            <div style={{ width: 280 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12.5, color: "#4a5568" }}>
                <span>Quote Value AED</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{q.quoteValue.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12.5, color: "#4a5568" }}>
                <span>VAT 5%</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{q.vat.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0 0",
                  marginTop: 6,
                  borderTop: "2px solid #0b1524",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#2e86de",
                }}
              >
                <span>Total Value AED</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{q.totalValue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 700, fontSize: 12.5, color: "#0b1524", marginBottom: 10, letterSpacing: 0.2 }}>
            Terms &amp; Conditions
          </div>
          <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 18 }}>
            {TERMS_CONDITIONS.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#2e86de", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11.5, color: "#4a5568", lineHeight: 1.8, marginBottom: 20 }}>
            <div>
              <b style={{ color: "#1a2233" }}>Currency:</b> Arab Emirates Dirham (AED)
            </div>
            <div>
              <b style={{ color: "#1a2233" }}>Delivery:</b> {q.delivery || "To be confirmed"}
            </div>
            <div>
              <b style={{ color: "#1a2233" }}>Delivery Place:</b> {q.deliveryPlace}
            </div>
            <div>
              <b style={{ color: "#1a2233" }}>Validity:</b> {q.validity}
            </div>
            <div>
              <b style={{ color: "#1a2233" }}>Payment Terms:</b> {q.paymentTerms || "To be confirmed"}
            </div>
          </div>

          <div style={{ fontSize: 11.5, color: "#4a5568", marginBottom: 26 }}>
            We look forward to meeting your expectations and to conducting a long-term business relationship.
            <br />
            Thanking you and assuring you of our best services at all times.
          </div>

          <div style={{ fontSize: 11.5, marginBottom: 36 }}>
            <div style={{ fontWeight: 600, color: "#1a2233" }}>For AL BAHRI AND AL MAZROEI TRADING COM. LLC</div>
            <div style={{ height: 32 }} />
            <div style={{ fontWeight: 700, color: "#1a2233" }}>{preparedByName}</div>
            <div style={{ color: "#6b7785" }}>{q.prepTitle}</div>
            <div style={{ color: "#6b7785" }}>{q.prepMobile ? `MOBILE: ${q.prepMobile}` : ""}</div>
          </div>

          <div
            style={{
              borderTop: "1px solid #eef1f5",
              paddingTop: 14,
              fontSize: 9.5,
              color: "#8a96a3",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <div>
              <div>شركة البحري والمزروعي التجارية ذ.م.م.-ش.ش.و</div>
              <div>Al Bahri &amp; Al Mazroei Trading Company L.L.C.- S.P.C</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>P.O. Box 72901, Abu Dhabi, United Arab Emirates</div>
              <div>00971 2 550 6700 &nbsp;|&nbsp; info@bmtc.ae &nbsp;|&nbsp; www.bmtc.ae</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
