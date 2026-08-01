import React, { memo } from "react";
import { Link } from "react-router-dom";
import { matIcon } from "../../utils/fonts";
import { formatPrice } from "../../utils/api";

/**
 * Small presentational primitives shared across the reseller screens.
 * Colour palette and radii intentionally mirror the existing storefront cards.
 */

/** Headline metric tile. */
export const StatCard = memo(({ icon, label, value, sub, gradient, money }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-2 flex items-center gap-2">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{
          background: gradient || "linear-gradient(135deg, #831843, #ec4899)",
        }}
      >
        <span style={matIcon} className="text-[18px] text-white">
          {icon}
        </span>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>
    </div>
    <p className="m-0 text-xl font-extrabold text-gray-900 max-md:text-lg">
      {money ? formatPrice(value || 0) : (value ?? 0)}
    </p>
    {sub && <p className="m-0 mt-0.5 text-[11px] text-gray-500">{sub}</p>}
  </div>
));
StatCard.displayName = "StatCard";

/** Coloured status pill, shared by orders / withdrawals / applications. */
const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  placed: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  packed: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  shipped: "bg-violet-50 text-violet-700 border-violet-200",
  "out for delivery": "bg-violet-50 text-violet-700 border-violet-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  reversed: "bg-rose-50 text-rose-700 border-rose-200",
  suspended: "bg-rose-50 text-rose-700 border-rose-200",
  returned: "bg-orange-50 text-orange-700 border-orange-200",
};

export const StatusPill = memo(({ status }) => {
  const key = String(status || "").toLowerCase();
  const cls = STATUS_STYLES[key] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
});
StatusPill.displayName = "StatusPill";

/** Consistent empty state with an optional call to action. */
export const EmptyState = memo(({ icon = "inbox", title, message, action }) => (
  <div className="rounded-xl border border-gray-100 bg-white py-14 text-center">
    <span style={matIcon} className="mb-3 block text-[48px] text-gray-300">
      {icon}
    </span>
    <h3 className="m-0 mb-1 text-base font-bold text-gray-800">{title}</h3>
    {message && (
      <p className="mx-auto m-0 mb-4 max-w-sm text-sm text-gray-500">
        {message}
      </p>
    )}
    {action}
  </div>
));
EmptyState.displayName = "EmptyState";

/** Primary gradient button used for the main action on each screen. */
export const PrimaryButton = memo(
  ({ children, icon, loading, className = "", as, to, ...rest }) => {
    const content = (
      <>
        {loading ? (
          <span
            className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
            style={{ animation: "rs-spin 0.7s linear infinite" }}
          />
        ) : (
          icon && (
            <span style={matIcon} className="text-[18px]">
              {icon}
            </span>
          )
        )}
        {children}
      </>
    );

    const cls = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-5 py-2.5 text-sm font-bold text-white no-underline shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${className}`;
    const style = {
      background: "linear-gradient(135deg, #831843, #ec4899)",
    };

    if (as === "link") {
      return (
        <Link to={to} className={cls} style={style}>
          {content}
        </Link>
      );
    }
    return (
      <button className={cls} style={style} disabled={loading} {...rest}>
        {content}
      </button>
    );
  },
);
PrimaryButton.displayName = "PrimaryButton";

/** Table/list loading skeleton at a fixed row height (no layout shift). */
export const RowsSkeleton = memo(({ rows = 5, height = 72 }) => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="animate-pulse rounded-xl bg-gray-200"
        style={{ height }}
      />
    ))}
  </div>
));
RowsSkeleton.displayName = "RowsSkeleton";

/** Grid of stat-card skeletons. */
export const StatsSkeleton = memo(({ count = 4 }) => (
  <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-[104px] animate-pulse rounded-xl bg-gray-200" />
    ))}
  </div>
));
StatsSkeleton.displayName = "StatsSkeleton";

/** Simple pager shared by every paginated list. */
export const Pagination = memo(({ pagination, onChange }) => {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, hasPrev, hasNext } = pagination;

  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        onClick={() => onChange(page - 1)}
        disabled={!hasPrev}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
        aria-label="Previous page"
      >
        <span style={matIcon} className="text-[18px]">
          chevron_left
        </span>
      </button>
      <span className="text-xs font-semibold text-gray-600">
        Page {page} of {pages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={!hasNext}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
        aria-label="Next page"
      >
        <span style={matIcon} className="text-[18px]">
          chevron_right
        </span>
      </button>
    </div>
  );
});
Pagination.displayName = "Pagination";

/** Gate shown when the profile isn't approved yet. */
export const ResellerGate = memo(({ status, message }) => {
  const STATES = {
    none: {
      icon: "storefront",
      title: "Start earning as a reseller",
      body: "Share products with your network, set your own margin and keep the profit.",
      cta: { label: "Become a reseller", to: "/reseller/apply" },
    },
    pending: {
      icon: "hourglass_top",
      title: "Application under review",
      body: "We're verifying your details. You'll be notified as soon as your store is live.",
    },
    rejected: {
      icon: "cancel",
      title: "Application not approved",
      body: message || "Your reseller application was not approved.",
    },
    suspended: {
      icon: "block",
      title: "Account suspended",
      body: message || "Your reseller account is currently suspended.",
    },
    approved: {
      icon: "storefront",
      title: "Your store is live",
      body: "Head to your dashboard to manage products, orders and earnings.",
      cta: { label: "Go to dashboard", to: "/reseller" },
    },
  };

  // Falls back to the onboarding state rather than crashing on an unexpected
  // status, which is what happened when an approved reseller opened the
  // application page.
  const config = STATES[status] || STATES.none;

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div
        className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: "linear-gradient(135deg, #fce7f3, #fbcfe8)" }}
      >
        <span style={matIcon} className="text-[40px] text-pink-600">
          {config.icon}
        </span>
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">{config.title}</h2>
      <p className="mx-auto mb-6 max-w-sm text-sm text-gray-500">
        {config.body}
      </p>
      {config.cta && (
        <PrimaryButton as="link" to={config.cta.to} icon="arrow_forward">
          {config.cta.label}
        </PrimaryButton>
      )}
      <style>{`@keyframes rs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
});
ResellerGate.displayName = "ResellerGate";
