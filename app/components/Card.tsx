import React from "react";

export default function Card({
  children,
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`w-full rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
