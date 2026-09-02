import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { canEditQuotes } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import PrintActions from "./print-actions";

const NAVY = "#003366";

interface IndexItem {
  description: string;
  status: "yes" | "no" | "na" | "";
}
interface CustomField {
  title: string;
  value: string;
}

export default async function SubmittalPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.mustResetPassword) redirect("/account/reset-password");

  const { id } = await params;
  const s = await prisma.submittal.findUnique({ where: { id } });
  if (!s) notFound();
  if (!user.role.isAdmin && s.departmentId !== user.departmentId) notFound();

  const items = (Array.isArray(s.indexItems) ? s.indexItems : []) as unknown as IndexItem[];
  const customFields = (Array.isArray(s.customFields) ? s.customFields : []) as unknown as CustomField[];
  const fullName = `${s.materialName} - ${s.brandName}`;

  const header = (
    <div
      style={{
        background: NAVY,
        color: "#fff",
        padding: "8px 1.5cm",
        fontSize: 11,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>Ref: {s.ref}</span>
      <span>{fullName}</span>
    </div>
  );

  const projectRows: Array<[string, string]> = (
    [
      ["PROJECT", s.projectName],
      ["CLIENT", s.employerName],
      ["CONSULTANT", s.consultantName],
      ["MAIN CONTRACTOR", s.mainContractor],
      ["MEP CONTRACTOR", s.mepContractor],
      ...customFields.filter((c) => c.title && c.value).map((c) => [c.title.toUpperCase(), c.value]),
    ] as Array<[string, string]>
  ).filter(([, v]) => v);

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        /* Padding is included inside the fixed page height everywhere on
           this page — without border-box, a content div's own padding
           gets added on top of its minHeight instead of eating into it,
           so the "one section per printed page" math silently doesn't add
           up and content spills onto a mostly-blank extra page. */
        .sub-page, .sub-page * { box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; margin: 0; }
          .sub-page-wrap { background: #fff !important; padding: 0 !important; }
          .sub-page { margin: 0 !important; box-shadow: none !important; page-break-after: always; }
        }
        .sub-page table, .sub-page th, .sub-page td { color: #1a2233; }
      `}</style>
      <div className="sub-page-wrap" style={{ background: "#f0f2f5", minHeight: "100vh", padding: "24px 0" }}>
        <div className="no-print" style={{ maxWidth: "210mm", margin: "0 auto 16px" }}>
          <PrintActions
            submittalRef={s.ref}
            projectName={s.projectName}
            materialName={s.materialName}
            brandName={s.brandName}
            items={items.map((i) => i.description)}
          />
          {canEditQuotes(user.role) && (
            <Link href={`/submittals/${s.id}/edit`} className="btn" style={{ marginLeft: 10 }}>
              Edit
            </Link>
          )}
        </div>

        {/* Cover page */}
        <div
          className="sub-page"
          style={{
            width: "210mm",
            minHeight: "297mm",
            margin: "0 auto 1cm",
            background: "#fff",
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            position: "relative",
            fontFamily: "var(--font-inter), Calibri, Arial, sans-serif",
          }}
        >
          {header}
          <div
            style={{
              padding: "4cm 1.5cm 2cm",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 28,
              minHeight: "calc(297mm - 40px)",
            }}
          >
            <div>
              <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 5 }}>Material Submittal for</p>
              <h1 style={{ fontSize: 22, fontWeight: 700, borderBottom: "3px double #000", paddingBottom: 3, display: "inline-block" }}>
                {fullName}
              </h1>
            </div>

            <div style={{ width: "100%", maxWidth: 480 }}>
              {projectRows.map(([label, value]) => (
                <div key={label} style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, textDecoration: "underline", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase" }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "auto", paddingBottom: "2cm", width: "100%", textAlign: "center" }}>
              <p style={{ fontWeight: 700, fontSize: 15, textDecoration: "underline", marginBottom: 18 }}>Submitted By</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bmtc-logo.png" alt="BMTC" style={{ maxWidth: 240, maxHeight: 80, objectFit: "contain", margin: "0 auto 14px" }} />
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                <p style={{ fontSize: 15, letterSpacing: 3, margin: "12px 0", fontWeight: 700 }}>ELECTRICAL SOLUTIONS</p>
                <p>PO BOX 72901, ABU DHABI, UNITED ARAB EMIRATES</p>
                <p>Tel: +971 2 550 6700 | Fax: +971 4 266 4627</p>
                <p style={{ color: NAVY }}>Web: www.bmtc.ae | E-mail: info@bmtc.ae</p>
              </div>
            </div>
          </div>
        </div>

        {/* Index page */}
        {items.length > 0 && (
          <div
            className="sub-page"
            style={{
              width: "210mm",
              minHeight: "297mm",
              margin: "0 auto 1cm",
              background: "#fff",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              fontFamily: "var(--font-inter), Calibri, Arial, sans-serif",
            }}
          >
            {header}
            <div style={{ padding: "4cm 1.5cm 2cm" }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, textDecoration: "underline", textUnderlineOffset: "8px", marginBottom: 28 }}>
                INDEX
              </h1>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["No.", "Description", "Yes", "No", "N/A"].map((h) => (
                      <th key={h} style={{ border: "1px solid #ccc", padding: 9, textAlign: "left", background: "#f2f4f8", fontWeight: 700 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ border: "1px solid #ccc", padding: 9 }}>{i + 1}.</td>
                      <td style={{ border: "1px solid #ccc", padding: 9 }}>{item.description}</td>
                      <td style={{ border: "1px solid #ccc", padding: 9 }}>{item.status === "yes" ? "✓" : ""}</td>
                      <td style={{ border: "1px solid #ccc", padding: 9 }}>{item.status === "no" ? "✓" : ""}</td>
                      <td style={{ border: "1px solid #ccc", padding: 9 }}>{item.status === "na" ? "✓" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Divider pages */}
        {items.map((item, i) => (
          <div
            key={i}
            className="sub-page"
            style={{
              width: "210mm",
              minHeight: "297mm",
              margin: "0 auto 1cm",
              background: "#fff",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              fontFamily: "var(--font-inter), Calibri, Arial, sans-serif",
            }}
          >
            {header}
            <div style={{ padding: "4cm 1.5cm 2cm", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(297mm - 40px)" }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, textDecoration: "underline", textUnderlineOffset: "8px" }}>
                {i + 1}. {item.description}
              </h1>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
