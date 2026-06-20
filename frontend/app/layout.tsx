import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Research Assistant",
  description: "A portfolio-ready RAG document assistant",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">AI Research Assistant</p>
                <p className="text-sm text-slate-500">Upload, ask, cite, and compare</p>
              </div>
              <nav className="flex gap-4 text-sm">
                <a href="/" className="hover:underline">Dashboard</a>
                <a href="/upload" className="hover:underline">Upload</a>
                <a href="/documents" className="hover:underline">Documents</a>
                <a href="/chat" className="hover:underline">Chat</a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
