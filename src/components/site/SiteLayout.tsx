import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AppHeader, AppFooterMini } from "./AppShell";
import { Toaster } from "@/components/ui/sonner";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile + tablet: app shell */}
      <div className="lg:hidden contents">
        <AppHeader />
      </div>
      {/* Desktop: classic website chrome */}
      <div className="hidden lg:contents">
        <TopBar />
        <Header />
      </div>

      <main className="flex-1">{children}</main>

      <div className="hidden lg:contents">
        <Footer />
      </div>
      <div className="lg:hidden contents">
        <AppFooterMini />
      </div>

      <Toaster richColors position="top-center" />
    </div>
  );
}
