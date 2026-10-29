import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://surfingonline.bd";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Surfing Online — Fast Fiber Internet Across Bangladesh",
    template: "%s | Surfing Online",
  },
  description:
    "Surfing Online brings fast, reliable fiber internet across Bangladesh. Affordable home & business packages, 24/7 local support. Check coverage and request a connection today.",
  keywords: [
    "Surfing Online",
    "ISP Bangladesh",
    "internet provider Bangladesh",
    "fiber broadband Dhaka",
    "broadband internet",
    "home internet BD",
    "bKash internet bill",
  ],
  authors: [{ name: "Surfing Online" }],
  creator: "Surfing Online",
  publisher: "Surfing Online",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Surfing Online — Fast Fiber Internet Across Bangladesh",
    description: "Affordable home & business fiber packages, 24/7 local support across Bangladesh.",
    url: SITE_URL,
    siteName: "Surfing Online",
    locale: "en_US",
    alternateLocale: "bn_BD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Surfing Online — Fast Fiber Internet Across Bangladesh",
    description: "Affordable home & business fiber packages, 24/7 local support across Bangladesh.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: { icon: "/surfing-online-icon.png", apple: "/surfing-online-icon.png" },
  category: "technology",
};

export const viewport = { themeColor: "#845EC2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
