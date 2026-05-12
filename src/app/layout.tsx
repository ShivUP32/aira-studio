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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} style={{ colorScheme: "dark", forcedColorAdjust: "none", backgroundColor: "#050C1A" } as React.CSSProperties}>
      <head>
        <meta name="color-scheme" content="dark" />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background-color: #050C1A !important;
            color: #EFF4F8 !important;
            forced-color-adjust: none !important;
            -webkit-forced-color-adjust: none !important;
          }
          *, *::before, *::after {
            forced-color-adjust: none !important;
            -webkit-forced-color-adjust: none !important;
          }
          #aira-bg-img {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            object-fit: cover;
            z-index: 0;
            pointer-events: none;
            display: block;
          }
          #aira-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }
        ` }} />
      </head>
      <body className="min-h-full flex flex-col text-foreground" style={{ backgroundColor: "#050C1A", color: "#EFF4F8", forcedColorAdjust: "none" } as React.CSSProperties}>
        {/* DOM-rendered background image: pixel content is immune to ALL browser color-override modes */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="aira-bg-img" src="/bg-main.svg" alt="" aria-hidden="true" />
        <div id="aira-content">
          {children}
        </div>
      </body>
    </html>
  );
}
