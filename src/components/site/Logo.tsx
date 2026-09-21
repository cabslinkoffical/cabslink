import { Link } from "@tanstack/react-router";
import logoGold100 from "@/assets/home/logos/cabslink-logo-gold-100.webp";
import logoGold150 from "@/assets/home/logos/cabslink-logo-gold-150.webp";
import logoDark100 from "@/assets/home/logos/cabslink-logo-dark-100.webp";
import logoDark150 from "@/assets/home/logos/cabslink-logo-dark-150.webp";

export function Logo({
  variant = "auto",
  priority = true,
}: {
  variant?: "auto" | "gold" | "dark";
  priority?: boolean;
}) {
  const small = variant === "dark" ? logoDark100 : logoGold100;
  const large = variant === "dark" ? logoDark150 : logoGold150;
  return (
    <Link to="/" className="flex items-center group" aria-label="Cabslink home">
      <img
        src={large}
        srcSet={`${small} 100w, ${large} 150w`}
        sizes="72px"
        alt="Cabslink"
        className="h-12 md:h-14 w-auto object-contain transition group-hover:scale-[1.02]"
        width={150}
        height={117}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </Link>
  );
}
