import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Research Assistant",
  description: "A portfolio-ready RAG document assistant",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/documents", label: "Documents" },
  { href: "/chat", label: "Chat" },
];

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.05),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#f8fafc_100%)] text-slate-900">
          <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">AI Research Assistant</p>
                <p className="text-sm text-slate-500">Upload, ask, cite, compare, and revisit sources</p>
              </div>
              <nav className="flex flex-wrap items-center gap-2 text-sm">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
