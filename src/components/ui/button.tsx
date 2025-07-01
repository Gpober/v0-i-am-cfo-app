// src/components/ui/button.tsx
import React from "react";

export function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      className={`px-4 py-2 rounded-md bg-[#3CA9E0] text-white font-medium hover:bg-[#2B91C0] transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
