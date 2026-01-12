import type { Metadata } from "next";
import Link from "next/link";
import SyncProvider from "@/components/SyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clarify RSS",
  description: "A personal, plaintext RSS reader",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Clarify",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <SyncProvider>
          <header className="border-b border-gray-200 dark:border-gray-800">
            <nav className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="text-xl font-bold">
                  Clarify
                </Link>
                <div className="flex gap-4">
                  <Link
                    href="/"
                    className="text-sm hover:text-gray-600 dark:hover:text-gray-400"
                  >
                    All Items
                  </Link>
                  <Link
                    href="/starred"
                    className="text-sm hover:text-gray-600 dark:hover:text-gray-400"
                  >
                    Starred
                  </Link>
                  <Link
                    href="/feeds"
                    className="text-sm hover:text-gray-600 dark:hover:text-gray-400"
                  >
                    Feeds
                  </Link>
                </div>
              </div>
            </nav>
          </header>
          <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
        </SyncProvider>
      </body>
    </html>
  );
}
