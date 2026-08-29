import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set.");
  if (!client) client = new Resend(key);
  return client;
}

function getFrom(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set.");
  return from;
}

function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error("APP_URL is not set.");
  return url.replace(/\/$/, "");
}

function wrapper(bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#17233a">
  <div style="font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#2569c2;font-weight:700;margin-bottom:16px">BMTC</div>
  ${bodyHtml}
  <p style="font-size:11.5px;color:#7c8ba0;margin-top:32px">Quotation &amp; LPO Control — internal system. If you weren't expecting this email, you can ignore it.</p>
</div>`;
}

export async function sendPasswordResetEmail(to: string, rawToken: string) {
  const resetUrl = `${getAppUrl()}/reset-password/${rawToken}`;
  await getClient().emails.send({
    from: getFrom(),
    to,
    subject: "Reset your password",
    html: wrapper(`
      <h1 style="font-size:18px;margin:0 0 12px">Reset your password</h1>
      <p style="font-size:13.5px;line-height:1.6">Click the button below to choose a new password. This link expires in 30 minutes and can only be used once.</p>
      <p style="margin:24px 0"><a href="${resetUrl}" style="background:#2569c2;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:13.5px;font-weight:600;display:inline-block">Reset password</a></p>
      <p style="font-size:11.5px;color:#7c8ba0;word-break:break-all">Or paste this link into your browser:<br>${resetUrl}</p>
    `),
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// The quotation content goes straight in the email body (not a link to the
// app) — the recipient is an external customer with no account, so a link
// behind our login would just bounce them to a sign-in page.
export async function sendQuotationEmail(input: {
  to: string;
  quoteRef: string;
  customerName: string;
  lines: { description: string; brand: string; qty: number; unitSell: number; lineTotal: number }[];
  quoteValue: number;
  vat: number;
  totalValue: number;
  senderName: string;
  senderTitle: string;
}) {
  const fmt = (n: number) => "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rows = input.lines
    .map(
      (l) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e8ec;font-size:12.5px">${escapeHtml(l.description)}${l.brand ? ` <span style="color:#7c8ba0">(${escapeHtml(l.brand)})</span>` : ""}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e8ec;font-size:12.5px;text-align:right">${l.qty}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e8ec;font-size:12.5px;text-align:right">${fmt(l.unitSell)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e8ec;font-size:12.5px;text-align:right">${fmt(l.lineTotal)}</td>
      </tr>`
    )
    .join("");

  await getClient().emails.send({
    from: getFrom(),
    to: input.to,
    subject: `Quotation ${input.quoteRef} — Al Bahri & Al Mazroei Trading Co.`,
    html: wrapper(`
      <h1 style="font-size:18px;margin:0 0 4px">Quotation ${escapeHtml(input.quoteRef)}</h1>
      <p style="font-size:13.5px;line-height:1.6">Dear ${escapeHtml(input.customerName) || "Sir/Madam"},</p>
      <p style="font-size:13.5px;line-height:1.6">We thank you for the referred enquiry and are pleased to offer the following quote:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 8px;font-size:10.5px;text-transform:uppercase;color:#7c8ba0;border-bottom:1px solid #e5e8ec">Description</th>
            <th style="text-align:right;padding:6px 8px;font-size:10.5px;text-transform:uppercase;color:#7c8ba0;border-bottom:1px solid #e5e8ec">Qty</th>
            <th style="text-align:right;padding:6px 8px;font-size:10.5px;text-transform:uppercase;color:#7c8ba0;border-bottom:1px solid #e5e8ec">Unit</th>
            <th style="text-align:right;padding:6px 8px;font-size:10.5px;text-transform:uppercase;color:#7c8ba0;border-bottom:1px solid #e5e8ec">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <table style="width:100%;font-size:13px;margin-bottom:20px">
        <tr><td style="padding:2px 8px;color:#7c8ba0">Quote value</td><td style="padding:2px 8px;text-align:right">${fmt(input.quoteValue)}</td></tr>
        <tr><td style="padding:2px 8px;color:#7c8ba0">VAT (5%)</td><td style="padding:2px 8px;text-align:right">${fmt(input.vat)}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:700">Total</td><td style="padding:4px 8px;text-align:right;font-weight:700;color:#2569c2">${fmt(input.totalValue)}</td></tr>
      </table>
      <p style="font-size:13.5px;line-height:1.6">We look forward to meeting your expectations and to conducting a long-term business relationship.</p>
      <p style="font-size:13.5px;line-height:1.6;margin-top:20px">Best regards,<br>${escapeHtml(input.senderName)}${input.senderTitle ? `<br>${escapeHtml(input.senderTitle)}` : ""}<br>Al Bahri &amp; Al Mazroei Trading Co.</p>
    `),
  });
}

export async function sendWelcomeEmail(to: string, name: string, tempPassword: string) {
  const loginUrl = `${getAppUrl()}/login`;
  await getClient().emails.send({
    from: getFrom(),
    to,
    subject: "Your BMTC Quotation & LPO Control account",
    html: wrapper(`
      <h1 style="font-size:18px;margin:0 0 12px">Welcome, ${name}</h1>
      <p style="font-size:13.5px;line-height:1.6">An account was created for you on BMTC Quotation &amp; LPO Control. Sign in with the temporary password below — you'll be asked to set your own right away.</p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse">
        <tr><td style="font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:#7c8ba0;padding:6px 0">Email</td><td style="font-size:13.5px;padding:6px 0">${to}</td></tr>
        <tr><td style="font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:#7c8ba0;padding:6px 0">Temporary password</td><td style="font-size:13.5px;padding:6px 0;font-family:monospace">${tempPassword}</td></tr>
      </table>
      <p style="margin:24px 0"><a href="${loginUrl}" style="background:#2569c2;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:13.5px;font-weight:600;display:inline-block">Sign in</a></p>
    `),
  });
}
