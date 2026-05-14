"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faPills, faClockRotateLeft, faUser } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/utils";

const tabs: { href: string; label: string; icon: IconDefinition }[] = [
  { href: "/",          label: "Home",     icon: faHouse },
  { href: "/medicines", label: "Medicines", icon: faPills },
  { href: "/history",   label: "History",   icon: faClockRotateLeft },
  { href: "/profile",   label: "Profile",   icon: faUser },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex">
        {tabs.map(({ href, label, icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[64px]",
                "transition-colors",
                active
                  ? "text-blue-600"
                  : "text-gray-400 hover:text-gray-600 active:text-gray-800"
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              <FontAwesomeIcon icon={icon} className="w-6 h-6" />
              <span className={cn("text-sm font-medium", active && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
