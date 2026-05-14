"use client";

import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  className?: string;
  rightSlot?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  className,
  rightSlot,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        "flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100",
        className
      )}
    >
      {showBack && (
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="flex items-center justify-center w-12 h-12 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-6 h-6 text-gray-700" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {rightSlot && <div className="ml-auto flex-shrink-0">{rightSlot}</div>}
    </header>
  );
}
