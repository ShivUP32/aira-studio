import type { Metadata } from "next";
import type React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aira Studio — AI Agent Builder",
  description: "Build voice-ready AI agents from your documents. No code required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} style={{ backgroundImage: "url('/bg-main.svg')", backgroundSize: "cover", backgroundAttachment: "fixed", colorScheme: "dark", forcedColorAdjust: "none" } as React.CSSProperties}>
      <head>
        <meta name="color-scheme" content="dark" />
        {/* SVG url() backgrounds survive ALL browser forced-colors implementations.
            background-image: url() is spec-preserved; background-color is not. */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background-image: url('/bg-main.svg') !important;
            background-size: cover !important;
            background-repeat: no-repeat !important;
            background-attachment: fixed !important;
            color: #EFF4F8 !important;
            forced-color-adjust: none !important;
            -webkit-forced-color-adjust: none !important;
          }
          *, *::before, *::after {
            forced-color-adjust: none !important;
            -webkit-forced-color-adjust: none !important;
          }
          .bg-aira-bg,
          .bg-aira-bg\\/80,
          .bg-aira-bg\\/60,
          .bg-aira-bg\\/50,
          .bg-aira-bg\\/40,
          .bg-aira-bg\\/30 {
            background-image: url('/bg-main.svg') !important;
            background-size: cover !important;
            background-position: center top !important;
            background-attachment: fixed !important;
          }
          .bg-aira-card,
          .bg-aira-card\\/40 {
            background-image: url('/bg-card.svg') !important;
            background-size: cover !important;
          }
        ` }} />
      </head>
      <body className="min-h-full flex flex-col bg-aira-bg text-foreground" style={{ backgroundImage: "url('/bg-main.svg')", backgroundSize: "cover", backgroundAttachment: "fixed", color: "#EFF4F8", forcedColorAdjust: "none" } as React.CSSProperties}>{children}</body>
    </html>
  );
}
