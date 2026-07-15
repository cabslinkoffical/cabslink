import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import sharp from "sharp";

const BASE = "https://cabslink.lovable.app";
mkdirSync("/tmp/adminfleet", { recursive: true });

const vehicles = JSON.parse(readFileSync("/tmp/adminfleet/vehicles.json", "utf8"));
const results = [];
for (const v of vehicles) {
  const rawUrl = v.image_url;
  const url = rawUrl.startsWith("http") ? rawUrl : `${BASE}${rawUrl}`;
  const safe = v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const inPath = `/tmp/adminfleet/${safe}.png`;
  execSync(`curl -sSL "${url}" -o "${inPath}"`);
  const srcSize = Number(execSync(`stat -c %s "${inPath}"`).toString().trim());
  const outPath = `/tmp/adminfleet/${safe}-1200.webp`;
  await sharp(inPath)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 90, effort: 5 })
    .toFile(outPath);
  const outSize = Number(execSync(`stat -c %s "${outPath}"`).toString().trim());
  const json = execSync(
    `lovable-assets create --file "${outPath}" --filename "${safe}-1200.webp"`,
    { encoding: "utf8" }
  );
  const parsed = JSON.parse(json);
  results.push({ id: v.id, name: v.name, from: srcSize, to: outSize, url: parsed.url });
  console.log(`${v.name}: ${srcSize} -> ${outSize}  ${parsed.url}`);
}
writeFileSync("/tmp/adminfleet/results.json", JSON.stringify(results, null, 2));
console.table(results.map(r => ({ name: r.name, from_kb: (r.from/1024).toFixed(1), to_kb: (r.to/1024).toFixed(1) })));
