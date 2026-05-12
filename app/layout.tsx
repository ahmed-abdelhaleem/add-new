import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";
import FloatingDump from "./components/FloatingDump";

export const metadata: Metadata = {
  title: "MOMENTUM",
  description: "AI-powered behavioral consistency engine",
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/log", label: "Log" },
  { href: "/nourish", label: "Nourish" },
  { href: "/ace", label: "ACE" },
  { href: "/more", label: "More" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen pb-24">
        <main className="mx-auto max-w-2xl px-4 pt-6">{children}</main>
        <FloatingDump />
        <nav className="fixed bottom-0 left-0 right-0 border-t border-ink-700 bg-ink-900/95 backdrop-blur">
          <ul className="mx-auto flex max-w-2xl items-center justify-between px-2 py-2 text-xs">
            {NAV.map((item) => (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                >
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </body>
    </html>
  );
}
