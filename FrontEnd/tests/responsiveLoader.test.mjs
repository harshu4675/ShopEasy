import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Keep the temporary entry under the frontend project so esbuild resolves
// React from this package's node_modules rather than from the system /tmp.
const tempDirectory = fs.mkdtempSync(
  path.join(path.resolve("tests"), ".responsive-"),
);
const entry = path.join(tempDirectory, "entry.jsx");
const bundle = path.join(tempDirectory, "bundle.js");
const hookPath = path.resolve("src/hooks/useMediaQuery.js");
const loaderPath = path.resolve("src/components/Loader.jsx");

fs.writeFileSync(
  entry,
  `import React from "react";
import ReactDOM from "react-dom/client";
import useMediaQuery from ${JSON.stringify(hookPath)};
import Loader from ${JSON.stringify(loaderPath)};
const Probe = () => {
  const desktop = useMediaQuery("(min-width: 768px)");
  return <output data-testid="media">{desktop ? "desktop" : "mobile"}</output>;
};
ReactDOM.createRoot(document.getElementById("root")).render(
  <><Probe /><Loader /><Loader fullScreen /></>,
);`,
);

execFileSync(
  "npx",
  [
    "esbuild",
    entry,
    "--bundle",
    "--format=iife",
    "--jsx=automatic",
    '--define:process.env.NODE_ENV="production"',
    `--outfile=${bundle}`,
    "--log-level=error",
  ],
  { stdio: ["ignore", "ignore", "inherit"] },
);
const script = fs.readFileSync(bundle, "utf8");

async function render(matches) {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
    { runScripts: "outside-only", pretendToBeVisual: true },
  );

  if (matches !== undefined) {
    dom.window.matchMedia = (query) => ({
      matches,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
  }
  dom.window.eval(script);

  const deadline = Date.now() + 2000;
  while (
    !dom.window.document.querySelector('[data-testid="media"]') &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
  return dom;
}

test.after(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

test("media hook renders both mobile and desktop branches", async () => {
  const mobile = await render(false);
  assert.equal(
    mobile.window.document.querySelector('[data-testid="media"]').textContent,
    "mobile",
  );
  mobile.window.close();

  const desktop = await render(true);
  assert.equal(
    desktop.window.document.querySelector('[data-testid="media"]').textContent,
    "desktop",
  );
  desktop.window.close();
});

test("media hook safely falls back when matchMedia is unavailable", async () => {
  const dom = await render(undefined);
  assert.equal(
    dom.window.document.querySelector('[data-testid="media"]').textContent,
    "mobile",
  );
  dom.window.close();
});

test("multiple loaders keep animation paint IDs unique and accessible", async () => {
  const dom = await render(true);
  const gradients = [
    ...dom.window.document.querySelectorAll("linearGradient"),
  ].map((element) => element.id);
  const statuses = dom.window.document.querySelectorAll('[role="status"]');
  const animated = [...dom.window.document.querySelectorAll("svg")].every(
    (svg) => /rotate/.test(svg.getAttribute("style") || ""),
  );

  assert.equal(gradients.length, 2);
  assert.equal(new Set(gradients).size, gradients.length);
  assert.equal(statuses.length, 2);
  assert.equal(
    [...statuses].every(
      (element) =>
        element.getAttribute("aria-label") === "Loading" &&
        element.getAttribute("aria-busy") === "true",
    ),
    true,
  );
  assert.equal(animated, true);
  dom.window.close();
});
