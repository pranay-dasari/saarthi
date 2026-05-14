import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function SectionCard({ children, className, padded = true }: SectionCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-sm border border-gray-100",
        padded && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
