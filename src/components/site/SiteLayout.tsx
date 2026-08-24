import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppButton } from "./WhatsAppButton";
import { FinalCta } from "./FinalCta";
import { LocationsDirectory } from "./LocationsDirectory";
import { SocialSection } from "./SocialSection";

export function SiteLayout({
  children,
  hideCta = false,
  hideLocations = false,
  hideSocial = false,
  locationsProps,
  socialProps,
}: {
  children: ReactNode;
  /** Hide the site-wide closing CTA (e.g. on booking / checkout flows). */
  hideCta?: boolean;
  /** Hide the site-wide locations directory. */
  hideLocations?: boolean;
  /** Hide the site-wide social band. */
  hideSocial?: boolean;
  /** Contextual copy overrides for the locations directory. */
  locationsProps?: React.ComponentProps<typeof LocationsDirectory>;
  /** Contextual copy overrides for the social band. */
  socialProps?: React.ComponentProps<typeof SocialSection>;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--gold)] focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-[var(--gold-foreground)] focus:shadow-lg"
      >
        Skip to main content
      </a>
      <TopBar />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
      {!hideCta && <FinalCta />}
      {!hideLocations && <LocationsDirectory {...locationsProps} />}
      {!hideSocial && <SocialSection {...socialProps} />}
      <Footer />
      <Toaster richColors position="top-center" />
      <WhatsAppButton />
    </div>
  );
}
