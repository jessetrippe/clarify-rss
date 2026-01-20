import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import SyncProvider from "@/components/SyncProvider";
import OfflineIndicator from "@/components/OfflineIndicator";
import ErrorBoundary from "@/components/ErrorBoundary";
import { MobileMenuProvider } from "@/components/MobileMenuProvider";
import LayoutShell from "@/components/LayoutShell";
import AuthGate from "@/components/AuthGate";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "Clarify RSS",
  description: "A personal, plaintext RSS reader focused on reading and copying article content",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clarify",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="min-h-screen font-sans">
        <ErrorBoundary>
          <AuthGate>
            <SyncProvider>
              <OfflineIndicator />
              <MobileMenuProvider>
                <LayoutShell>{children}</LayoutShell>
              </MobileMenuProvider>
            </SyncProvider>
          </AuthGate>
        </ErrorBoundary>
      </body>
    </html>
  );
}
