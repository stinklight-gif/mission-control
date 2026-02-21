"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/docs", label: "Docs" },
  { href: "/team", label: "Team" }
];

function isActiveLink(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-800 px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Market Ops
          </p>
          <h1 className="text-2xl font-semibold">Mission Control</h1>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          {navLinks.map((link) => {
            const isActive = isActiveLink(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition ${
                  isActive
                    ? "text-slate-100 border-b border-slate-200/70"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
      <p className="mt-3 text-sm text-slate-400 italic">
        An autonomous organization of AI agents that does work for me and produces value 24/7
      </p>
    </header>
  );
}
