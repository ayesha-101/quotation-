import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import ToastProvider from "./toast-provider";
import CommandPalette from "./command-palette";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BMTC Quotation & LPO Control",
  description: "Internal quotation, LPO, and user access control system.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#4f7396",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('bmtc-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`}
        </Script>
        <ToastProvider>
          {children}
          <CommandPalette />
        </ToastProvider>
      </body>
    </html>
  );
}
