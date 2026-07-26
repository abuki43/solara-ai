"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Demo", href: "#demo" },
  { label: "Features", href: "#features" },
  { label: "Use Cases", href: "#agents" },
  { label: "Workflow", href: "#workflow" },
  { label: "Live", href: "#live" },
  { label: "Pricing", href: "#pricing" },
];

const NAV_STYLE = {
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  background: "rgba(245,244,240,0.30)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)",
} as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-3xl">
        <nav
          className="flex items-center justify-between rounded-2xl border border-black/[0.06] px-5 py-3"
          style={NAV_STYLE}
        >
          <Link href="/" className="font-pixel text-xs tracking-[0.25em] text-black/70">
            SOLARA AI
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[11px] tracking-wide text-black/60 transition-colors hover:text-black"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-xl border border-black/10 px-4 py-2 text-[11px] tracking-wide text-black/60 transition-all hover:border-black/20 hover:bg-black/[0.03] hover:text-black md:block"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#111] px-4 py-2 text-[11px] tracking-wide text-white transition-colors hover:bg-[#333]"
            >
              START BUILDING
            </Link>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex size-8 flex-col items-center justify-center gap-[5px] rounded-lg hover:bg-black/[0.04] md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              <span
                className="block h-px w-[18px] bg-black/60 transition-all duration-300"
                style={{ transform: open ? "translateY(6px) rotate(45deg)" : "none" }}
              />
              <span
                className="block h-px w-[18px] bg-black/60 transition-all duration-300"
                style={{ opacity: open ? 0 : 1 }}
              />
              <span
                className="block h-px w-[18px] bg-black/60 transition-all duration-300"
                style={{ transform: open ? "translateY(-6px) rotate(-45deg)" : "none" }}
              />
            </button>
          </div>
        </nav>

        <div
          className="mt-2 overflow-hidden transition-all duration-300 md:hidden"
          style={{ maxHeight: open ? "280px" : "0px", opacity: open ? 1 : 0 }}
        >
          <div className="flex flex-col rounded-2xl border border-black/[0.06] px-2 py-2" style={NAV_STYLE}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm tracking-wide text-black/60 transition-colors hover:bg-black/[0.03] hover:text-black"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-sm text-black/60 hover:bg-black/[0.03]"
            >
              Sign in
            </Link>
            <div className="mt-1 px-2 pb-1">
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="block w-full text-[11px] px-4 py-2.5 rounded-xl border border-black/10 text-black/60 hover:text-black hover:border-black/20 hover:bg-black/[0.03] transition-all duration-200 tracking-wide text-center"
              >
                START BUILDING
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
