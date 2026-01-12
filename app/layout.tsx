import type { Metadata } from "next";
import Link from "next/link";
import SyncProvider from "@/components/SyncProvider";
import OfflineIndicator from "@/components/OfflineIndicator";
import InstallPrompt from "@/components/InstallPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clarify RSS",
  description: "A personal, plaintext RSS reader focused on reading and copying article content",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clarify",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
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
        <ErrorBoundary>
          <SyncProvider>
            <OfflineIndicator />
            <InstallPrompt />
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
        </ErrorBoundary>
      </body>
    </html>
  );
}
