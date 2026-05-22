import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to SnapGuard AI to access your secure dashboard.",
  alternates: {
    canonical: "/login",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
