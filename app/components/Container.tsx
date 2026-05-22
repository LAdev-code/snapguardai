import React from "react";

export default function Container({
  children,
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-[var(--space-container-mobile)] md:px-[var(--space-container-desktop)] ${className}`}>{children}</div>
  );
}
