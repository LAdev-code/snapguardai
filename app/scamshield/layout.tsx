import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ScamShield",
  description: "Private scam risk analysis workspace.",
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
