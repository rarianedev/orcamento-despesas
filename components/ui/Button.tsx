"use client";

import * as React from "react";

type Variant = "primary" | "secondary" | "outline" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#0B2E6F] text-white hover:bg-[#082354] focus:ring-[#0B2E6F] border border-transparent",
  secondary:
    "bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB] focus:ring-[#9CA3AF] border border-[#D1D5DB]",
  outline:
    "bg-transparent text-[#0B2E6F] border border-[#0B2E6F] hover:bg-[#EFF6FF] focus:ring-[#0B2E6F]",
  danger:
    "bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#FECACA] focus:ring-[#FCA5A5] border border-transparent",
};

export function Button({
  variant = "primary",
  fullWidth,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    />
  );
}
