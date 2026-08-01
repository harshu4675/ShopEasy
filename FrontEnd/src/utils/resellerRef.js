/**
 * Reseller attribution for the current browsing session.
 *
 * When a shopper lands on /s/:slug or /store/:code the reseller's code is
 * stored here, so that when they eventually check out the order can be
 * credited to the right reseller. sessionStorage (not localStorage) keeps the
 * attribution scoped to the visit rather than following the device forever.
 *
 * Lives in utils rather than in the storefront page so `Checkout` can read it
 * without pulling a lazily-loaded route chunk into the checkout bundle.
 */

const KEY = "talish:resellerRef";

export const rememberResellerRef = (code) => {
  if (!code) return;
  try {
    sessionStorage.setItem(KEY, String(code).toUpperCase());
  } catch {
    /* private browsing — attribution is best-effort */
  }
};

export const getResellerRef = () => {
  try {
    return sessionStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
};

export const clearResellerRef = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
};

export default getResellerRef;
