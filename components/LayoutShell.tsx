"use client";

import { useMobileMenu } from "@/components/MobileMenuProvider";
import Sidebar from "@/components/Sidebar";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen, closeMenu } = useMobileMenu();

  return (
    <div className="flex h-screen">
      {/* Backdrop overlay - only visible on mobile/tablet when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 xl:hidden transition-opacity duration-300 ease-in-out"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Responsive visibility:
          Mobile (< 640px): Fixed overlay, shown when isOpen
          Tablet (640-1279px): Fixed overlay, shown when isOpen
          Desktop (≥ 1280px): Always visible, sticky positioned
      */}
      <Sidebar
        className={`
          fixed inset-y-0 left-0 z-40 w-80
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          xl:translate-x-0 xl:static xl:z-0
        `}
      />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
