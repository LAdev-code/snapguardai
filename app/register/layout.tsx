import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a SnapGuard AI account to start scam checks, receipt analysis, and financial coaching.",
  alternates: {
    canonical: "/register",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
