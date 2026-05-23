import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Money Coach Financial Health",
  description: "Track spending, savings goals, receipts, and AI-generated financial insights in your Money Coach workspace.",
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
