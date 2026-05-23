import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import Nav from './components/Nav';
import Footer from './components/Footer';
import { getBaseUrl, getMetadataBase } from "../lib/siteUrl";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const baseUrl = getBaseUrl();
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const previewImage = {
  url: "/assets/snapguard-logo-512.png",
  width: 512,
  height: 512,
  alt: "SnapGuard AI logo",
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SnapGuard AI",
    url: baseUrl,
    description: "AI-powered scam protection and personal finance insights.",
    areaServed: "MY",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SnapGuard AI",
    url: baseUrl,
    description: "Protect your money and understand your spending with AI.",
    inLanguage: "en",
  },
];

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "SnapGuard AI | Scam Protection and Financial Insights",
    template: "%s | SnapGuard AI",
  },
  description: "SnapGuard AI helps users detect scams, analyze receipts, and improve financial health with secure AI-powered workflows.",
  applicationName: "SnapGuard AI",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "scam detection",
    "receipt scanner",
    "financial health",
    "money management",
    "Malaysia finance app",
    "AI fraud protection",
    "SnapGuard AI",
  ],
  openGraph: {
    type: "website",
    locale: "en_MY",
    url: "/",
    siteName: "SnapGuard AI",
    title: "SnapGuard AI | Scam Protection and Financial Insights",
    description: "Detect scam risks, organize receipts, and track your financial health in one AI-powered app.",
    images: [previewImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapGuard AI",
    description: "Detect scam risks, organize receipts, and track your financial health.",
    images: [previewImage.url],
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(googleVerification
    ? {
        verification: {
          google: googleVerification,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background pb-20 md:pb-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Nav />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
