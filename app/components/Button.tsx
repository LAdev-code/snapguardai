import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md";
  const variants: Record<string, string> = {
    primary: "bg-[var(--color-primary)] text-[var(--color-on-primary, #fff)]",
    secondary:
      "bg-[var(--color-secondary)] text-[var(--color-on-secondary, #fff)]",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
