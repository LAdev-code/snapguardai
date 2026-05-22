import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a SnapGuard AI account to start scam checks and financial analysis.",
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
