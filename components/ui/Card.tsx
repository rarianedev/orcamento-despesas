import * as React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-sm border border-[#E5E7EB] ${className}`}
      {...props}
    />
  );
}
