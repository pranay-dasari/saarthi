import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  size?: "md" | "lg" | "xl";
  fullWidth?: boolean;
}

const variantClasses: Record<string, string> = {
  primary:   "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 border-2 border-blue-600",
  secondary: "bg-white text-gray-800 hover:bg-gray-50 active:bg-gray-100 border-2 border-gray-300",
  danger:    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border-2 border-red-600",
  success:   "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 border-2 border-green-600",
  ghost:     "bg-transparent text-blue-600 hover:bg-blue-50 active:bg-blue-100 border-2 border-blue-200",
};

const sizeClasses: Record<string, string> = {
  md: "min-h-[56px] px-6 text-lg",
  lg: "min-h-[64px] px-8 text-xl",
  xl: "min-h-[72px] px-10 text-2xl",
};

export function BigButton({
  variant = "primary",
  size = "lg",
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: BigButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-3 rounded-2xl font-semibold",
        "transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300",
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {children}
    </button>
  );
}
