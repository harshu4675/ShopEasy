const cheerio = require("cheerio");
const dns = require("node:dns/promises");
const net = require("node:net");

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();
const USER_AGENT = "ShopEasy Product Importer/1.0 (+admin product preview)";
const PLATFORMS = {
  amazon: ["amazon."], flipkart: ["flipkart.com"], myntra: ["myntra.com"],
  ajio: ["ajio.com"], meesho: ["meesho.com"],
};

function present(value) { return value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length); }
function text(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function array(value) { return Array.isArray(value) ? value : value ? [value] : []; }
function absolute(value, base) { try { const url = new URL(value, base); return /^https?:$/.test(url.protocol) ? url.href : null; } catch { return null; } }
function number(value) { const match = String(value ?? "").replace(/,/g, "").match(/(?:₹|Rs\.?|INR|\$|€|£)?\s*([0-9]+(?:\.\d{1,2})?)/i); return match ? Number(match[1]) : null; }
function currency(value, fallback) { const v = String(value || fallback || ""); if (/₹|\b(?:inr|rs)\b/i.test(v)) return "INR"; if (/\$|\busd\b/i.test(v)) return "USD"; if (/€|\beur\b/i.test(v)) return "EUR"; return null; }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function privateIp(ip) { return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:") || /^127\.|^10\.|^192\.168\.|^169\.254\.|^0\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip); }
async function safeUrl(input) {
  let url; try { url = new URL(input); } catch { throw Object.assign(new Error("Enter a valid http or https URL."), { reason: "INVALID_URL" }); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw Object.assign(new Error("Enter a public http or https URL."), { reason: "INVALID_URL" });
  const addresses = net.isIP(url.hostname) ? [{ address: url.hostname }] : await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateIp(address))) throw Object.assign(new Error("The URL must point to a public website."), { reason: "INVALID_URL" });
  return url.href;
}
function platformFor(url) { const host = new URL(url).hostname.toLowerCase(); return Object.entries(PLATFORMS).find(([, domains]) => domains.some((d) => host.includes(d)))?.[0] || "generic"; }
function metaMap($) { const m = {}; $("meta").each((_, el) => { const key = ($(el).attr("property") || $(el).attr("name") || $(el).attr("itemprop") || "").toLowerCase(); const val = $(el).attr("content"); if (key && val && !m[key]) m[key] = text(val); }); return m; }
function flattenJsonLd(value, output = []) { if (Array.isArray(value)) value.forEach((v) => flattenJsonLd(v, output)); else if (value && typeof value === "object") { output.push(value); if (value["@graph"]) flattenJsonLd(value["@graph"], output); } return output; }
function jsonLd($) { const all = []; $('script[type="application/ld+json"]').each((_, el) => { try { flattenJsonLd(JSON.parse($(el).contents().text()), all); } catch {} }); return all; }
function productNode(nodes) { return nodes.find((n) => array(n["@type"]).map((t) => String(t).toLowerCase()).includes("product")) || {}; }
function pickImage($, base) {
  const candidates = [];
  $("img").each((_, el) => { const $el = $(el); const srcset = $el.attr("srcset") || $el.attr("data-srcset"); if (srcset) candidates.push(...srcset.split(",").map((s) => s.trim().split(/\s+/)[0])); candidates.push($el.attr("data-zoom-image"), $el.attr("data-original"), $el.attr("data-src"), $el.attr("src")); });
  return unique(candidates.map((v) => absolute(v, base)).filter((v) => v && !/logo|icon|sprite|pixel|banner|advert/i.test(v))).sort((a, b) => b.length - a.length).slice(0, 12);
}
function visible($, selectors) { for (const s of selectors) { const v = text($(s).first().text()); if (v) return v; } return null; }
function domData($, base) {
  const title = visible($, ["h1[itemprop='name']", "h1", "[data-testid*='product-title']", "[class*='product-title']"]);
  const body = visible($, ["[itemprop='description']", "#productDescription", "[class*='description']", "[class*='product-detail']"]);
  const priceText = visible($, ["[itemprop='price']", "[class*='selling-price']", "[class*='sale-price']", "[class*='price']"]);
  const originalText = visible($, ["[class*='mrp']", "[class*='original-price']", "del"]);
  const ratingText = visible($, ["[itemprop='ratingValue']", "[class*='rating']"]);
  const crumbs = unique($("nav[aria-label*='breadcrumb' i] a, .breadcrumb a, [class*='breadcrumb'] a").map((_, e) => text($(e).text())).get());
  const specs = {}; $("table tr, [class*='specification'] li, [class*='detail'] li").each((_, e) => { const parts = text($(e).text()).split(/\s*[:|]\s*/); if (parts.length >= 2 && parts[0].length < 60) specs[parts[0]] = parts.slice(1).join(": "); });
  const sizes = unique($("select[name*='size' i] option, [data-size], [class*='size'] button").map((_, e) => text($(e).attr("data-size") || $(e).text())).get().filter((v) => v && !/select size/i.test(v)));
  const colors = unique($("[data-color], [class*='color'] button, [class*='colour'] button").map((_, e) => text($(e).attr("data-color") || $(e).attr("aria-label") || $(e).text())).get().filter((v) => v && v.length < 40));
  return { title, description: body, price: number(priceText), originalPrice: number(originalText), currency: currency(priceText), ratingValue: number(ratingText), breadcrumbs: crumbs, category: crumbs.at(-2) || null, subcategory: crumbs.at(-1) || null, specifications: specs, sizes, colors, images: pickImage($, base) };
}
function merge(...sources) { const out = {}; for (const source of sources) for (const [key, value] of Object.entries(source || {})) if (!present(out[key]) && present(value)) out[key] = value; return out; }
class GenericProvider {
  extract(html, base) {
    const $ = cheerio.load(html); const meta = metaMap($); const nodes = jsonLd($); const p = productNode(nodes); const offer = array(p.offers).find(Boolean) || nodes.find((n) => array(n["@type"]).includes("Offer")) || {}; const rating = p.aggregateRating || {};
    const ld = { title: text(p.name), description: text(p.description), brand: text(p.brand?.name || p.brand), sku: p.sku || null, mpn: p.mpn || null, gtin: p.gtin || p.gtin13 || p.gtin12 || null, productId: p.productID || null, category: p.category || null, images: array(p.image).map((i) => absolute(typeof i === "string" ? i : i?.url, base)), price: number(offer.price || offer.lowPrice), originalPrice: number(offer.highPrice), currency: offer.priceCurrency || null, availability: text(offer.availability).split("/").pop() || null, canonicalUrl: absolute(p.url, base), ratingValue: number(rating.ratingValue), ratingCount: number(rating.ratingCount), reviewCount: number(rating.reviewCount), breadcrumbs: [] };
    const og = { title: meta["og:title"] || meta["twitter:title"], description: meta["og:description"] || meta["twitter:description"] || meta.description, images: [absolute(meta["og:image"] || meta["twitter:image"], base)], price: number(meta["product:price:amount"] || meta.price), currency: meta["product:price:currency"] || currency(meta["product:price:amount"]), canonicalUrl: absolute(meta["og:url"], base) };
    return { data: merge(ld, og, domData($, base)), diagnostics: { jsonLd: nodes.length > 0, openGraph: Boolean(meta["og:title"] || meta["og:image"]), rendered: false } };
  }
}
class AmazonProvider extends GenericProvider {} class FlipkartProvider extends GenericProvider {} class MyntraProvider extends GenericProvider {} class AjioProvider extends GenericProvider {} class MeeshoProvider extends GenericProvider {}
const providers = { amazon: AmazonProvider, flipkart: FlipkartProvider, myntra: MyntraProvider, ajio: AjioProvider, meesho: MeeshoProvider, generic: GenericProvider };
async function fetchPage(url) { const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" } }); if (!response.ok) throw Object.assign(new Error(`Marketplace returned ${response.status}.`), { reason: response.status === 401 || response.status === 403 ? "BLOCKED" : "NETWORK_ERROR" }); const html = await response.text(); if (/captcha|cf-chl-|access denied|robot check/i.test(html)) throw Object.assign(new Error("This marketplace did not allow automatic product extraction. Please enter the missing information manually."), { reason: "BLOCKED" }); return { html, url: response.url }; }
async function rendered(url) { let chromium; try { ({ chromium } = require("playwright")); } catch { return null; } let browser; try { browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ userAgent: USER_AGENT }); await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }); await page.waitForTimeout(1200); return { html: await page.content(), url: page.url() }; } catch { return null; } finally { await browser?.close(); } }
function normalize(data, original, final, platform, diagnostics) { const images = unique(array(data.images).map((i) => absolute(i, final))).slice(0, 12); const price = number(data.price); const originalPrice = number(data.originalPrice); const discountPercentage = price && originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : null; const result = { title: data.title || null, description: data.description || null, shortDescription: data.description?.slice(0, 250) || null, brand: data.brand || null, category: data.category || null, subcategory: data.subcategory || null, productType: data.productType || null, price, originalPrice, mrp: originalPrice, salePrice: price, currency: data.currency || "INR", discount: discountPercentage, discountPercentage, images, primaryImage: images[0] || null, thumbnail: images[0] || null, rating: data.ratingValue || null, ratingValue: data.ratingValue || null, ratingCount: data.ratingCount || null, reviewCount: data.reviewCount || null, availability: data.availability || null, stockStatus: data.availability || null, sku: data.sku || null, productId: data.productId || null, asin: platform === "amazon" ? (data.productId || data.sku || null) : null, mpn: data.mpn || null, gtin: data.gtin || null, barcode: data.gtin || null, sourceUrl: original, affiliateUrl: original, originalAffiliateUrl: original, finalResolvedUrl: final, canonicalUrl: data.canonicalUrl || final, platform, colors: data.colors || [], sizes: data.sizes || [], variants: [], specifications: data.specifications || {}, attributes: data.specifications || {}, features: [], shippingInformation: null, returnInformation: null, sellerName: null, sellerRating: null, breadcrumbs: data.breadcrumbs || [], rawMetadata: diagnostics };
  const fields = ["title", "description", "primaryImage", "price", "brand", "category", "ratingValue", "availability", "sku", "sizes", "colors", "specifications"]; const detected = fields.filter((k) => present(result[k])); result.importQuality = { detected: detected.length, total: fields.length, percentage: Math.round(detected.length / fields.length * 100), missing: fields.filter((k) => !present(result[k])) }; return result; }
async function importProduct(input) { const original = await safeUrl(input); const cached = cache.get(original); if (cached && cached.expires > Date.now()) return cached.value; const first = await fetchPage(original); const platform = platformFor(first.url); const Provider = providers[platform]; let extraction = new Provider().extract(first.html, first.url); const essential = ["title", "price", "primaryImage"].filter((k) => !present(extraction.data[k === "primaryImage" ? "images" : k])); if (essential.length) { const page = await rendered(first.url); if (page) { const enhanced = new Provider().extract(page.html, page.url); extraction = { data: merge(enhanced.data, extraction.data), diagnostics: { ...extraction.diagnostics, ...enhanced.diagnostics, rendered: true } }; } }
  const product = normalize(extraction.data, original, first.url, platform, extraction.diagnostics); const value = { success: Boolean(product.title || product.images.length), reason: product.title ? (product.importQuality.missing.length ? "PARTIAL_DATA" : null) : "NO_PRODUCT_DATA", message: product.title ? null : "No product information was available. Please enter the details manually.", platform, product }; cache.set(original, { value, expires: Date.now() + CACHE_TTL }); console.info("[product-import]", JSON.stringify({ platform, jsonLd: extraction.diagnostics.jsonLd, openGraph: extraction.diagnostics.openGraph, rendered: extraction.diagnostics.rendered, images: product.images.length, price: !!product.price, brand: !!product.brand, rating: !!product.rating, variants: product.colors.length + product.sizes.length, specifications: Object.keys(product.specifications).length })); return value; }
module.exports = { importProduct, safeUrl };
