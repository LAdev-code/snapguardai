import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ScamShield Scam Checker",
  description: "Scan messages, screenshots, and payment proofs to detect scam risks and get a clear safety verdict.",
  alternates: {
    canonical: "/scamshield",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ScamShieldLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
