import { Link } from "@tanstack/react-router";
import logoGold from "@/assets/cabslink-logo-gold.png.asset.json";
import logoDark from "@/assets/cabslink-logo-dark.png.asset.json";

export function Logo({ variant = "auto" }: { variant?: "auto" | "gold" | "dark" }) {
  const src = variant === "gold" ? logoGold.url : variant === "dark" ? logoDark.url : logoGold.url;
  return (
    <Link to="/" className="flex items-center group" aria-label="Cabslink home">
      <img
        src={src}
        alt="Cabslink"
        className="h-12 md:h-14 w-auto object-contain transition group-hover:scale-[1.02]"
        width={240}
        height={56}
      />
    </Link>
  );
}
