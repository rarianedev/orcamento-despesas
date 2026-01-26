"use client";

import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-sm font-medium text-[#111827]">{label}</label>
        )}
        <input
          ref={ref}
          className={`h-10 rounded-full border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0B2E6F] focus:border-transparent ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs text-[#B91C1C] font-medium">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
