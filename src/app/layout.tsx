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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} style={{ backgroundColor: "#050C1A", colorScheme: "dark", forcedColorAdjust: "none" } as React.CSSProperties}>
      <head>
        <meta name="color-scheme" content="dark" />
        {/* Critical dark theme: injected inline so it loads before any external stylesheet
            and cannot be stripped by forced-colors, auto-dark, or caching */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background-color: #050C1A !important;
            color: #EFF4F8 !important;
            forced-color-adjust: none !important;
            -webkit-forced-color-adjust: none !important;
            color-scheme: dark !important;
          }
          *, *::before, *::after {
            forced-color-adjust: none !important;
            -webkit-forced-color-adjust: none !important;
          }
        ` }} />
      </head>
      <body className="min-h-full flex flex-col bg-aira-bg text-foreground" style={{ backgroundColor: "#050C1A", color: "#EFF4F8", forcedColorAdjust: "none" } as React.CSSProperties}>{children}</body>
    </html>
  );
}
