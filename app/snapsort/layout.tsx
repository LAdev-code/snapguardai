import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SnapSortAI",
  description: "Private receipt analysis workspace.",
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
