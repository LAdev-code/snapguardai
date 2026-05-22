import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Money Coach",
  description: "Private financial health coaching workspace.",
  alternates: {
    canonical: "/moneycoach",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function MoneyCoachLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
