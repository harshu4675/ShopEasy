#!/usr/bin/env node
/**
 * One-command Lighthouse audit against a local production build.
 *
 *   npm run build
 *   npm run lighthouse            # mobile (default)
 *   npm run lighthouse -- --desktop
 *   npm run lighthouse -- --url https://talishclothes.netlify.app
 *
 * Requires Chrome/Chromium on the machine. Writes an HTML report to
 * ./lighthouse-report.<preset>.html and prints the category scores plus the
 * Core Web Vitals so before/after runs are directly comparable.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

const args = process.argv.slice(2);
const desktop = args.includes("--desktop");
const urlArg = args.indexOf("--url");
const remoteUrl = urlArg !== -1 ? args[urlArg + 1] : null;
const PORT = 4173;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

/** Serves ./dist with SPA fallback, mirroring the Netlify _redirects rule. */
const startServer = () =>
  new Promise((resolve, reject) => {
    if (!existsSync(distDir)) {
      reject(new Error("dist/ not found — run `npm run build` first."));
      return;
    }

    const server = createServer(async (req, res) => {
      let pathname = decodeURIComponent(req.url.split("?")[0]);
      let filePath = path.join(distDir, pathname);

      if (!existsSync(filePath) || pathname === "/") {
        filePath = path.join(distDir, "index.html");
      }

      try {
        const body = await readFile(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Cache-Control": pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "no-cache",
        });
        res.end(body);
      } catch {
        res.writeHead(404).end("Not found");
      }
    });

    server.listen(PORT, () => resolve(server));
    server.on("error", reject);
  });

const run = () =>
  new Promise((resolve, reject) => {
    const target = remoteUrl || `http://localhost:${PORT}/`;
    const preset = desktop ? "desktop" : "mobile";
    const output = `lighthouse-report.${preset}.html`;

    const lhArgs = [
      "--yes",
      "lighthouse",
      target,
      "--output=html",
      "--output=json",
      `--output-path=./${output}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
      "--quiet",
    ];
    if (desktop) lhArgs.push("--preset=desktop");

    console.log(`\n▶ Auditing ${target} (${preset})…\n`);

    const proc = spawn("npx", lhArgs, { stdio: "inherit", shell: false });
    proc.on("close", (code) =>
      code === 0 ? resolve(output) : reject(new Error(`lighthouse exited ${code}`)),
    );
    proc.on("error", reject);
  });

const summarise = async (htmlPath) => {
  const jsonPath = htmlPath.replace(/\.html$/, ".report.json");
  if (!existsSync(jsonPath)) return;

  const report = JSON.parse(await readFile(jsonPath, "utf8"));
  const pct = (c) => Math.round((report.categories[c]?.score ?? 0) * 100);
  const audit = (id) => report.audits[id]?.displayValue ?? "n/a";

  console.log("\n──────── SCORES ────────");
  console.log("Performance   :", pct("performance"));
  console.log("Accessibility :", pct("accessibility"));
  console.log("Best practices:", pct("best-practices"));
  console.log("SEO           :", pct("seo"));

  console.log("\n──── CORE WEB VITALS ────");
  console.log("FCP :", audit("first-contentful-paint"));
  console.log("LCP :", audit("largest-contentful-paint"));
  console.log("TBT :", audit("total-blocking-time"));
  console.log("CLS :", audit("cumulative-layout-shift"));
  console.log("SI  :", audit("speed-index"));
  console.log("TTI :", audit("interactive"));
  console.log(`\nFull report: ${htmlPath}\n`);
};

let server;
try {
  if (!remoteUrl) server = await startServer();
  const out = await run();
  await summarise(out);
} catch (err) {
  console.error("\n✖", err.message);
  console.error("  Lighthouse needs Chrome installed and network access to npx.\n");
  process.exitCode = 1;
} finally {
  server?.close();
}
