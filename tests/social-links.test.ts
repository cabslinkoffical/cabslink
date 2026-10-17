import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { SOCIALS } from "@/lib/social";

const FOOTER = readFileSync("src/components/site/Footer.tsx", "utf8");
const LAYOUT = readFileSync("src/components/site/SiteLayout.tsx", "utf8");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

describe("social links live in the footer only", () => {
  it("footer renders every verified profile from the shared list", () => {
    expect(SOCIALS.map((s) => s.key).join(",")).toBe(
      "instagram,facebook,tiktok,youtube",
    );
    for (const s of SOCIALS) {
      expect(s.url, `${s.label} URL missing`).toMatch(/^https:\/\//);
      expect(s.handle.length, `${s.label} handle missing`).toBeGreaterThan(0);
    }
    // The footer must drive its links from the shared SOCIALS list, not a copy.
    expect(FOOTER).toContain('import { SOCIALS } from "@/lib/social"');
    expect(FOOTER).toMatch(
      /SOCIALS\.map\(\(\{[^}]*\burl\b[^}]*\bhandle\b[^}]*\}\) =>/,
    );
    expect(FOOTER).toContain("href={url}");
    expect(FOOTER).toContain("{handle}");
    expect(FOOTER).toContain("Follow Cabslink");
  });

  it("footer social links open in a new tab and are labelled", () => {
    const links = FOOTER.match(/aria-label=\{`\$\{label\} — \$\{handle\}`\}/g) ?? [];
    expect(links.length).toBe(1);
    expect(FOOTER).toContain('target="_blank"');
    expect(FOOTER).toContain("rel=\"noopener noreferrer\"");
  });

  it("no standalone social band is rendered site-wide", () => {
    expect(LAYOUT).not.toContain("SocialSection");
    expect(existsSync("src/components/site/SocialSection.tsx")).toBe(false);
    for (const file of walk("src/routes")) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} still refers to the social band`).not.toMatch(
        /SocialSection|hideSocial|socialProps/,
      );
    }
  });
});
