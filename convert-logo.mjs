import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import sharp from "sharp";

for (const f of ["cabslink-logo-gold", "cabslink-logo-dark"]) {
  const pointerPath = `src/assets/${f}.png.asset.json`;
  const meta = JSON.parse(readFileSync(pointerPath, "utf8"));
  if (meta.srcSet) { console.log("skip", f); continue; }
  const inPath = `/tmp/logo/${f}.png`;
  const outputs = {};
  for (const w of [200, 400]) {
    const outPath = `/tmp/logo/${f}-${w}.webp`;
    await sharp(inPath)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100, effort: 6 })
      .toFile(outPath);
    const size = Number(execSync(`stat -c %s "${outPath}"`).toString().trim());
    const json = execSync(
      `lovable-assets create --file "${outPath}" --filename "${f}-${w}.webp"`,
      { encoding: "utf8" }
    );
    const parsed = JSON.parse(json);
    outputs[w] = { url: parsed.url, size };
    console.log(`  ${f}-${w}.webp -> ${size}B ${parsed.url}`);
  }
  const newPointer = {
    ...meta,
    version: 1,
    url: outputs[400].url,
    srcSet: `${outputs[200].url} 200w, ${outputs[400].url} 400w`,
    fallbackUrl: meta.url,
    variants: outputs,
    original_filename: `${f}-400.webp`,
    size: outputs[400].size,
    content_type: "image/webp",
  };
  writeFileSync(pointerPath, JSON.stringify(newPointer, null, 2) + "\n");
}
console.log("done");
