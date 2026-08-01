#!/usr/bin/env node
/**
 * Prints the size of what a first-time visitor actually downloads, plus the
 * lazily-loaded route chunks.
 *
 *   npm run analyze          # builds, then reports
 *   node scripts/bundle-report.mjs
 *
 * "Initial load" = index.html + entry chunk + eagerly-preloaded vendor chunks
 * + critical CSS. Route chunks are listed separately because they only cost
 * bandwidth when the user visits that route.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { gzipSync, brotliCompressSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "..", "dist");
const assets = path.join(dist, "assets");

if (!existsSync(dist)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

const measure = async (file) => {
  const buf = await readFile(file);
  return {
    name: path.basename(file),
    raw: buf.length,
    gzip: gzipSync(buf).length,
    brotli: brotliCompressSync(buf).length,
  };
};

const html = await readFile(path.join(dist, "index.html"), "utf8");

// Anything the HTML references directly is on the critical path.
const referenced = new Set(
  [...html.matchAll(/\/assets\/([^"']+\.(?:js|css))/g)].map((m) => m[1]),
);

const files = (await readdir(assets)).filter((f) => /\.(js|css)$/.test(f));
const measured = await Promise.all(
  files.map((f) => measure(path.join(assets, f))),
);

const initial = measured.filter((m) => referenced.has(m.name));
const lazy = measured
  .filter((m) => !referenced.has(m.name))
  .sort((a, b) => b.raw - a.raw);

const htmlStat = await measure(path.join(dist, "index.html"));

const sum = (list, key) => list.reduce((t, m) => t + m[key], 0);

console.log("\n═══ INITIAL LOAD (first-time visitor) ═══");
console.log(
  `${"file".padEnd(38)}${"raw".padStart(10)}${"gzip".padStart(10)}${"brotli".padStart(10)}`,
);
for (const m of [htmlStat, ...initial].sort((a, b) => b.raw - a.raw)) {
  console.log(
    `${m.name.padEnd(38)}${kb(m.raw).padStart(10)}${kb(m.gzip).padStart(10)}${kb(m.brotli).padStart(10)}`,
  );
}
const initRaw = htmlStat.raw + sum(initial, "raw");
const initGz = htmlStat.gzip + sum(initial, "gzip");
const initBr = htmlStat.brotli + sum(initial, "brotli");
console.log("─".repeat(68));
console.log(
  `${"TOTAL".padEnd(38)}${kb(initRaw).padStart(10)}${kb(initGz).padStart(10)}${kb(initBr).padStart(10)}`,
);

console.log(`\n═══ LAZY ROUTE CHUNKS (${lazy.length}) ═══`);
for (const m of lazy.slice(0, 15)) {
  console.log(
    `${m.name.padEnd(38)}${kb(m.raw).padStart(10)}${kb(m.gzip).padStart(10)}`,
  );
}
if (lazy.length > 15) console.log(`… and ${lazy.length - 15} more`);
console.log("─".repeat(58));
console.log(
  `${"deferred total".padEnd(38)}${kb(sum(lazy, "raw")).padStart(10)}${kb(sum(lazy, "gzip")).padStart(10)}`,
);

// Static assets (icons, manifest) that ship alongside the app.
const staticFiles = (await readdir(dist)).filter((f) => /\.(png|jpg|svg|ico)$/.test(f));
if (staticFiles.length) {
  let staticTotal = 0;
  console.log("\n═══ STATIC ASSETS ═══");
  for (const f of staticFiles) {
    const s = await stat(path.join(dist, f));
    staticTotal += s.size;
    console.log(`${f.padEnd(38)}${kb(s.size).padStart(10)}`);
  }
  console.log("─".repeat(48));
  console.log(`${"total".padEnd(38)}${kb(staticTotal).padStart(10)}`);
}

console.log(
  `\nChunks: ${measured.filter((m) => m.name.endsWith(".js")).length} JS, ` +
    `${measured.filter((m) => m.name.endsWith(".css")).length} CSS\n`,
);
