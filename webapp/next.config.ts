import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdf.js) loads its worker script from a real file path at
  // runtime — bundling it through Turbopack/webpack breaks that lookup, so
  // keep it as a plain Node require instead. See lib/pdf-text.ts.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
