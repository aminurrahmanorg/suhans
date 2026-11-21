// ============================================================
//  layout.tsx  — Root layout: font, metadata, accent CSS var
// ============================================================
import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { siteConfig, theme } from "@/data/site";

// ---- Load both fonts; we'll pick the right one at runtime ----
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// ---- SEO metadata driven by site.ts ----
export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Choose the font CSS variable based on theme.fontFamily
  const fontVar =
    theme.fontFamily === "Poppins" ? "--font-poppins" : "--font-inter";

  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      {/*
        Inject the accent colour as a CSS variable so Hero.tsx can use it
        without Tailwind arbitrary-value hacks.  Also set the active font.
      */}
      <body
        style={
          {
            "--accent": theme.accentColor,
            fontFamily: `var(${fontVar}), sans-serif`,
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
