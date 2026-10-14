import type { Metadata } from "next";
import Link from "next/link";
import { writesAuthenticated } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { unresolvedFailures } from "@/lib/core";
import "./globals.css";

export const metadata: Metadata = { title: "Relay", description: "Pipelines, transfers, and failures." };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const open = unresolvedFailures(await getStore().listTransfers()).open.length;
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased">
        <header className="border-b border-gray-300">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">Relay</Link>
            <Link href="/pipelines" className="underline-offset-2 hover:underline">Pipelines</Link>
            <Link
              href="/failures"
              className={open > 0 ? "rounded bg-red-600 px-2 py-0.5 font-semibold text-white" : "underline-offset-2 hover:underline"}
            >
              Failures{open > 0 ? ` (${open})` : ""}
            </Link>
            <Link href="/log" className="underline-offset-2 hover:underline">Log</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          {children}
          <footer className="mt-10 space-y-1 border-t border-gray-200 pt-3 text-xs text-gray-500">
            {!writesAuthenticated() && <p>API writes are unauthenticated.</p>}
          </footer>
        </main>
      </body>
    </html>
  );
}
