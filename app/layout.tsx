import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXUS AI — Antifragile Intelligence for the Brains of Tomorrow",
  description:
    "NEXUS AI empowers tomorrow's businesses and young entrepreneurs with antifragile intelligence: live web-grounded market analysis, an internal resilience Command Center, and Young Founder Mode. Built for Brainwave 2026.",
  keywords: [
    "NEXUS AI",
    "Brainwave 2026",
    "Empowering Brains of Tomorrow",
    "FutureProof Score",
    "young entrepreneurs",
    "Young Founder Mode",
    "Startup India",
    "antifragile",
    "business intelligence",
    "Groq",
    "scenario simulator",
  ],
  authors: [{ name: "NEXUS AI" }],
  openGraph: {
    title: "NEXUS AI — Antifragile Intelligence for the Brains of Tomorrow",
    description:
      "Empowering tomorrow's businesses and young entrepreneurs: live market analysis, an internal resilience Command Center, and Young Founder Mode. Built for Brainwave 2026.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-nexus-bg text-nexus-text antialiased">
        {children}
      </body>
    </html>
  );
}
