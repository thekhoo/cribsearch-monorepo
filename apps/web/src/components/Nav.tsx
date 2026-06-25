"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Search" },
  { href: "/history", label: "History" },
  { href: "/pois", label: "POIs" },
] as const;

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-3">
        <span className="text-lg font-bold tracking-tight">Cribsearch</span>
        <div className="flex gap-4">
          {LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition ${
                  active
                    ? "text-gray-900 underline underline-offset-4"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
