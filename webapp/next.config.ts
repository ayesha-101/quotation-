import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdf.js) loads its worker script from a real file path at
  // runtime — bundling it through Turbopack/webpack breaks that lookup, so
  // keep it as a plain Node require instead. See lib/pdf-text.ts.
  serverExternalPackages: ["pdf-parse"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // This app is never meant to be framed by another site — blocks
          // clickjacking (an invisible iframe overlaying real buttons).
          { key: "X-Frame-Options", value: "DENY" },
          // Stops a browser from guessing a response is executable content
          // based on its bytes instead of trusting the declared Content-Type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak this app's internal URLs (quotation/submittal ids in
          // the path) to a third-party site when a user clicks an outbound link.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
