import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SnapSortAI Receipt Scanner",
  description: "Upload receipts, extract merchant and transaction details, and save structured spending records to SnapGuard AI.",
  alternates: {
    canonical: "/snapsort",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SnapSortLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
