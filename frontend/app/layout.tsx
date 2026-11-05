import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Hind_Siliguri } from "next/font/google";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { Toaster } from "@/components/ui/sonner";
import { IdleLogout } from "@/hooks/useIdleLogout";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SITE_URL } from "@/lib/site";
import "lenis/dist/lenis.css";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Parallax — See your work from every angle",
    template: "%s",
  },
  description:
    "Parallax compares academic documents lexically, semantically, conceptually, and structurally across Bangla, English, and mixed text, and shows reviewers the evidence.",
  applicationName: "Parallax",
  keywords: [
    "academic similarity",
    "Bangla",
    "cross-lingual",
    "semantic similarity",
    "Daffodil International University",
    "thesis",
  ],
  authors: [{ name: "Khandaker Samin Yeasar" }, { name: "Nusrat Jahan" }],
  openGraph: {
    type: "website",
    siteName: "Parallax",
    title: "Parallax — See your work from every angle",
    description:
      "Lexical, semantic, concept and structural similarity for Bangla-English academic work, with the evidence.",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Parallax — See your work from every angle",
    description: "Potential similarity for Bangla-English academic work, explained with evidence.",
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${hindSiliguri.variable} antialiased`}
    >
      <body className="min-h-dvh">
        <ThemeProvider>
          <MotionProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <IdleLogout />
            </AuthProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
