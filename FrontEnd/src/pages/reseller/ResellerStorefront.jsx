import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  api,
  formatPrice,
  resellerAPI,
  getErrorMessage,
} from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import useGoogleFonts from "../../hooks/useGoogleFonts";
import SmartImage from "../../components/SmartImage";
import {
  EmptyState,
  PrimaryButton,
} from "../../components/reseller/ResellerUI";
import { rememberResellerRef } from "../../utils/resellerRef";

/**
 * Public landing page for reseller share links.
 *
 * Two shapes, one component:
 *   /s/:slug      → a single shared product
 *   /store/:code  → the reseller's whole storefront
 *
 * The reseller code is persisted to sessionStorage so it survives the journey
 * through cart → checkout and can be attached to the resulting order for
 * commission attribution.
 */

const StoreHeader = ({ store }) => (
  <div
    className="px-5 py-6 text-white max-md:px-4 max-md:py-5"
    style={{
      background:
        "linear-gradient(135deg, #4a0e2e 0%, #831843 50%, #be185d 100%)",
    }}
  >
    <div className="mx-auto flex max-w-[1100px] items-center gap-4">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 text-xl font-extrabold"
        style={{ background: "rgba(255,255,255,0.15)" }}
      >
        {store.storeLogo ? (
          <img
            src={store.storeLogo}
            alt=""
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          (store.storeName || "S").charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0">
        <h1 className="m-0 truncate text-xl font-extrabold max-md:text-lg">
          {store.storeName}
        </h1>
        {store.bio && (
          <p className="m-0 mt-0.5 line-clamp-2 text-xs text-pink-100">
            {store.bio}
          </p>
        )}
        <p className="m-0 mt-1 flex items-center gap-1 text-[10px] text-pink-200">
          <span style={matIcon} className="text-[12px]">
            verified
          </span>
          Verified reseller · {store.resellerCode}
        </p>
      </div>
    </div>
  </div>
);

const ResellerStorefront = () => {
  const { slug, code } = useParams();
  const location = useLocation();

  useGoogleFonts(
    "reseller-store-fonts",
    "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap",
  );

  const [data, setData] = useState(null);
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (slug) {
          const res = await resellerAPI.getPublicProduct(slug);
          if (cancelled) return;
          setData(res.data.data);
          setStore(res.data.data.store);
          rememberResellerRef(res.data.data.store?.resellerCode);
        } else {
          const res = await resellerAPI.getPublicStore(code, { limit: 24 });
          if (cancelled) return;
          setProducts(res.data.data || []);
          setStore(res.data.store);
          rememberResellerRef(res.data.store?.resellerCode);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, code]);

  // A `?ref=` param on any of these URLs also counts for attribution.
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref) rememberResellerRef(ref.toUpperCase());
  }, [location.search]);

  const addToCart = useCallback(async () => {
    if (!data?.product) return;
    setAdding(true);
    try {
      await api.post("/cart/add", {
        productId: data.product._id,
        quantity: 1,
        size: data.product.sizes?.[0] || "",
        color: data.product.colors?.[0]?.name || "",
      });
      showToast("Added to cart", "success");
    } catch (err) {
      const status = err?.response?.status;
      showToast(
        status === 401
          ? "Please log in to add items to your cart"
          : getErrorMessage(err),
        "error",
      );
    } finally {
      setAdding(false);
    }
  }, [data]);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-50"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div className="h-28 animate-pulse bg-gray-200" />
        <div className="mx-auto max-w-[1100px] p-4">
          <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[280px] animate-pulse rounded-xl bg-gray-200"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-gray-50 p-4"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <EmptyState
          icon="link_off"
          title="Link unavailable"
          message={error || "This store or product is no longer available."}
          action={
            <PrimaryButton as="link" to="/" icon="home">
              Go to homepage
            </PrimaryButton>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 pb-10"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <StoreHeader store={store} />

      <div className="mx-auto max-w-[1100px] px-4 pt-4 max-md:px-3">
        {/* Single shared product */}
        {slug && data?.product && (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="grid grid-cols-2 gap-6 p-5 max-md:grid-cols-1 max-md:gap-4 max-md:p-4">
              <div className="aspect-square overflow-hidden rounded-xl bg-gray-50">
                <SmartImage
                  src={data.product.images?.[0]}
                  alt={data.product.name}
                  className="h-full w-full object-contain p-4"
                  width={640}
                  sizes="(max-width: 768px) 100vw, 500px"
                  priority
                />
              </div>

              <div>
                <h2 className="m-0 mb-2 text-xl font-bold text-gray-900 max-md:text-lg">
                  {data.listing?.customTitle || data.product.name}
                </h2>

                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-pink-600">
                    {formatPrice(data.product.price)}
                  </span>
                  {data.product.originalPrice > data.product.price && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(data.product.originalPrice)}
                    </span>
                  )}
                </div>

                {data.product.rating > 0 && (
                  <p className="m-0 mb-3 flex items-center gap-1 text-xs text-gray-600">
                    <span
                      style={matIcon}
                      className="text-[16px] text-amber-500"
                    >
                      star
                    </span>
                    {data.product.rating.toFixed(1)} (
                    {data.product.numReviews || 0} reviews)
                  </p>
                )}

                <p className="m-0 mb-4 text-sm leading-relaxed text-gray-600">
                  {data.listing?.customDescription || data.product.description}
                </p>

                <div className="mb-4 flex flex-wrap gap-2">
                  {data.product.sizes?.slice(0, 8).map((s) => (
                    <span
                      key={s}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <PrimaryButton
                    onClick={addToCart}
                    loading={adding}
                    icon="shopping_cart"
                    className="flex-1"
                  >
                    Add to cart
                  </PrimaryButton>
                  <Link
                    to={`/product/${data.product._id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-pink-500 bg-white px-5 py-2.5 text-sm font-bold text-pink-600 no-underline"
                  >
                    View details
                  </Link>
                </div>

                {store.whatsappNumber && (
                  <a
                    href={`https://wa.me/91${store.whatsappNumber}?text=${encodeURIComponent(`Hi, I'm interested in ${data.product.name}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white no-underline"
                  >
                    <span style={matIcon} className="text-[18px]">
                      chat
                    </span>
                    Chat with seller
                  </a>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 bg-gray-50 p-4 text-center">
              <Link
                to={`/store/${store.resellerCode}`}
                className="text-xs font-bold text-pink-600 no-underline"
              >
                See all products from {store.storeName} →
              </Link>
            </div>
          </div>
        )}

        {/* Full storefront */}
        {!slug && (
          <>
            {products.length === 0 ? (
              <EmptyState
                icon="storefront"
                title="No products yet"
                message="This store hasn't added any products."
              />
            ) : (
              <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
                {products.map((p) => (
                  <Link
                    key={p._id}
                    to={`/s/${p.shareSlug}`}
                    className="block overflow-hidden rounded-xl border border-gray-100 bg-white no-underline shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="aspect-square bg-white">
                      <SmartImage
                        src={p.images?.[0]}
                        alt={p.name}
                        className="h-full w-full object-contain p-2"
                        width={320}
                        sizes="(max-width: 768px) 45vw, 240px"
                      />
                    </div>
                    <div className="p-3">
                      <p
                        className="m-0 mb-1 text-xs font-semibold text-gray-800"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: "32px",
                        }}
                      >
                        {p.name}
                      </p>
                      <span className="text-sm font-bold text-pink-600">
                        {formatPrice(p.price)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        <p className="mt-6 text-center text-[11px] text-gray-400">
          Sold and fulfilled by Talish Clothes ·{" "}
          <Link to="/" className="text-pink-600 no-underline">
            Visit main store
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResellerStorefront;
