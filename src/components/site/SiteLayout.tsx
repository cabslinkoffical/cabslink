import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppButton } from "./WhatsAppButton";
import { FinalCta } from "./FinalCta";

export function SiteLayout({
  children,
  hideCta = false,
}: {
  children: ReactNode;
  /** Hide the site-wide closing CTA (e.g. on booking / checkout flows). */
  hideCta?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />
      <Header />
      <main className="flex-1">{children}</main>
      {!hideCta && <FinalCta />}
      <Footer />
      <Toaster richColors position="top-center" />
      <WhatsAppButton />
    </div>
  );
}

