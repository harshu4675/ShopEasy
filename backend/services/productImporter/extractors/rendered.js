/**
 * Rendered-page extraction.
 *
 * For JavaScript-heavy ecommerce pages, the server-rendered HTML may not
 * contain the product data. This module attempts to render the page in a
 * headless browser (Playwright) and extract data from the live DOM.
 *
 * Playwright is loaded lazily and is OPTIONAL. If it is not installed, this
 * module returns null and the importer falls back to the HTML/metadata
 * extraction layers. No API credentials are ever required.
 */

const RENDER_TIMEOUT = 30000; // hard cap for the whole render attempt
const NAVIGATE_TIMEOUT = 20000;
const NETWORK_IDLE_TIMEOUT = 4000;

let playwrightPromise = null;

/**
 * Lazily load Playwright. Returns null if unavailable.
 */
async function loadPlaywright() {
  if (playwrightPromise !== null) return playwrightPromise;
  playwrightPromise = (async () => {
    try {
      // eslint-disable-next-line global-require
      const pw = require('playwright');
      return pw;
    } catch {
      try {
        // eslint-disable-next-line global-require
        const pw = require('playwright-core');
        return pw;
      } catch {
        return null;
      }
    }
  })();
  return playwrightPromise;
}

/**
 * Detect whether the page is protected by a bot challenge.
 */
function detectChallenge(page) {
  return page
    .content()
    .then((html) => {
      const lower = html.toLowerCase();
      if (
        lower.includes('captcha') ||
        lower.includes('cf-challenge') ||
        lower.includes('cloudflare') ||
        lower.includes('access denied') ||
        lower.includes('please verify you are a human') ||
        lower.includes('enable javascript and cookies')
      ) {
        return 'BLOCKED';
      }
      return null;
    })
    .catch(() => null);
}

/**
 * Extract product data from the rendered DOM.
 *
 * @param {string} url - The URL to render.
 * @returns {Promise<{ html: string, domData: object, usedRendered: boolean, blocked: boolean }>}
 */
async function extractRendered(url) {
  const pw = await loadPlaywright();
  if (!pw) {
    return { html: null, domData: null, usedRendered: false, blocked: false };
  }

  let browser;
  try {
    browser = await pw.chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'en-IN',
    });

    const page = await context.newPage();

    // Hard timeout for the whole render.
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('RENDER_TIMEOUT')), RENDER_TIMEOUT);
    });

    const navigation = (async () => {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATE_TIMEOUT,
      });
      // Wait a bit for JS to run
      try {
        await page.waitForLoadState('networkidle', {
          timeout: NETWORK_IDLE_TIMEOUT,
        });
      } catch {
        // network may not idle (trackers); proceed anyway
      }
      // Small settle window for lazy content
      await page.waitForTimeout(1500);

      const challenge = await detectChallenge(page);
      if (challenge) {
        return { blocked: true, html: null, domData: null, usedRendered: true };
      }

      const html = await page.content();

      // Grab structured data that only exists after rendering
      const domData = await page.evaluate(() => {
        const result = {};
        const text = (sel) => {
          const el = document.querySelector(sel);
          return el ? el.textContent.trim() : null;
        };
        const all = (sel) =>
          Array.from(document.querySelectorAll(sel))
            .map((el) => el.textContent.trim())
            .filter(Boolean);

        result.title = text('h1') || text('[data-product-name]');
        result.price = text('[data-price]') ||
          text('.price') ||
          text('.sale-price') ||
          text('[itemprop="price"]');
        result.originalPrice = text('.original-price') ||
          text('.mrp') ||
          text('.strike-price');
        result.brand = text('.brand') || text('[data-brand]');
        result.rating = text('[data-rating]') || text('.rating-value');
        result.sizes = all('.size-option, .size-button, [data-size]').slice(0, 30);
        result.colors = all('.color-option, .color-swatch, [data-color]').slice(0, 30);
        result.breadcrumbs = all('.breadcrumb a, .breadcrumbs a').slice(0, 10);

        // Images from rendered gallery (skip logos/icons)
        const imgUrls = [];
        document.querySelectorAll('img').forEach((img) => {
          const src = img.currentSrc || img.src || img.dataset.src || img.dataset.original;
          if (!src) return;
          if (/logo|icon|avatar|pixel|tracking|sprite/i.test(src)) return;
          const w = img.naturalWidth || 0;
          if (w && w < 100) return;
          imgUrls.push(src);
        });
        result.images = [...new Set(imgUrls)].slice(0, 20);

        // Specs table
        const specs = {};
        document.querySelectorAll('table tr').forEach((tr) => {
          const cells = tr.querySelectorAll('td, th');
          if (cells.length >= 2) {
            const k = cells[0].textContent.trim();
            const v = cells[cells.length - 1].textContent.trim();
            if (k && v) specs[k] = v;
          }
        });
        result.specifications = Object.keys(specs).length ? specs : null;

        return result;
      });

      return { html, domData, usedRendered: true, blocked: false };
    })();

    const outcome = await Promise.race([navigation, timeout]);
    return outcome;
  } catch (err) {
    if (err && err.message === 'RENDER_TIMEOUT') {
      return { html: null, domData: null, usedRendered: true, blocked: false, error: 'TIMEOUT' };
    }
    return {
      html: null,
      domData: null,
      usedRendered: true,
      blocked: false,
      error: err.message,
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore close errors
      }
    }
  }
}

module.exports = { extractRendered, loadPlaywright };