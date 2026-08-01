import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { resellerAPI, formatPrice, formatDate } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import useReseller from "../../hooks/useReseller";
import ResellerLayout from "../../components/reseller/ResellerLayout";
import {
  StatCard,
  StatusPill,
  EmptyState,
  PrimaryButton,
  RowsSkeleton,
  StatsSkeleton,
  ResellerGate,
} from "../../components/reseller/ResellerUI";

/**
 * Reseller home: wallet snapshot, performance counters, share tools and the
 * most recent orders.
 */
const ResellerDashboard = () => {
  const {
    reseller,
    loading: profileLoading,
    isApproved,
    status,
  } = useReseller();

  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isApproved) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    const load = async () => {
      try {
        const [walletRes, ordersRes, analyticsRes] = await Promise.all([
          resellerAPI.getWallet().catch(() => null),
          resellerAPI.getOrders({ limit: 5 }).catch(() => null),
          resellerAPI.getAnalytics({ days: 30 }).catch(() => null),
        ]);
        if (cancelled) return;

        setWallet(walletRes?.data?.data || null);
        setOrders(ordersRes?.data?.data || []);
        setAnalytics(analyticsRes?.data?.data || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isApproved]);

  const storeUrl = reseller?.shareBaseUrl;

  const copyStoreLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      showToast("Store link copied", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Could not copy link", "error");
    }
  };

  if (profileLoading) {
    return (
      <ResellerLayout title="Reseller Hub">
        <StatsSkeleton />
      </ResellerLayout>
    );
  }

  if (!isApproved) {
    return (
      <div
        className="min-h-screen bg-gray-50"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <ResellerGate
          status={reseller ? status : "none"}
          message={reseller?.statusReason}
        />
      </div>
    );
  }

  const totals = analytics?.totals;

  return (
    <ResellerLayout
      title={reseller.storeName}
      subtitle={`Store code ${reseller.resellerCode} · ${reseller.commissionRate}% platform commission`}
      action={
        <PrimaryButton
          as="link"
          to="/reseller/catalog"
          icon="add_shopping_cart"
          className="!bg-white/15 backdrop-blur-md"
        >
          Add products
        </PrimaryButton>
      }
    >
      {loading ? (
        <>
          <StatsSkeleton />
          <div className="mt-4">
            <RowsSkeleton rows={4} />
          </div>
        </>
      ) : (
        <>
          {/* Share your store */}
          <div
            className="mt-4 overflow-hidden rounded-xl p-4 text-white"
            style={{
              background:
                "linear-gradient(135deg, #4a0e2e 0%, #831843 60%, #be185d 100%)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-pink-200">
                  <span style={matIcon} className="text-[16px]">
                    link
                  </span>
                  Your store link
                </p>
                <p className="m-0 mt-1 truncate font-mono text-sm text-white/90">
                  {storeUrl}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyStoreLink}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/30 bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/25"
                >
                  <span style={matIcon} className="text-[16px]">
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "Copied" : "Copy"}
                </button>
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/15 px-4 py-2 text-xs font-bold text-white no-underline backdrop-blur-md transition-all hover:bg-white/25"
                >
                  <span style={matIcon} className="text-[16px]">
                    open_in_new
                  </span>
                  Open store
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Shop at ${reseller.storeName}: ${storeUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-bold text-white no-underline transition-all hover:brightness-110"
                >
                  <span style={matIcon} className="text-[16px]">
                    share
                  </span>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Wallet */}
          <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
            <StatCard
              icon="account_balance_wallet"
              label="Available"
              value={wallet?.availableBalance}
              money
              sub="Ready to withdraw"
              gradient="linear-gradient(135deg, #10b981, #059669)"
            />
            <StatCard
              icon="hourglass_top"
              label="Pending"
              value={wallet?.pendingBalance}
              money
              sub="Clears after delivery"
              gradient="linear-gradient(135deg, #f59e0b, #d97706)"
            />
            <StatCard
              icon="today"
              label="Today"
              value={wallet?.todayEarnings}
              money
              sub="Earned today"
              gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
            />
            <StatCard
              icon="trending_up"
              label="Lifetime"
              value={wallet?.lifetimeEarnings}
              money
              sub={`₹${wallet?.monthEarnings ?? 0} this month`}
              gradient="linear-gradient(135deg, #831843, #ec4899)"
            />
          </div>

          {/* 30-day performance */}
          <div className="mt-4 grid grid-cols-4 gap-3 max-md:grid-cols-2">
            <StatCard
              icon="visibility"
              label="Clicks (30d)"
              value={totals?.clicks}
              gradient="linear-gradient(135deg, #06b6d4, #0891b2)"
            />
            <StatCard
              icon="shopping_bag"
              label="Orders (30d)"
              value={totals?.orders}
              gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
            />
            <StatCard
              icon="percent"
              label="Conversion"
              value={`${totals?.conversionRate ?? 0}%`}
              gradient="linear-gradient(135deg, #f43f5e, #e11d48)"
            />
            <StatCard
              icon="inventory_2"
              label="Products listed"
              value={reseller.stats?.productsListed}
              gradient="linear-gradient(135deg, #0ea5e9, #0284c7)"
            />
          </div>

          {/* Recent orders */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="m-0 text-base font-bold text-gray-900">
                Recent orders
              </h2>
              <Link
                to="/reseller/orders"
                className="flex items-center gap-0.5 text-xs font-bold text-pink-600 no-underline"
              >
                View all
                <span style={matIcon} className="text-[14px]">
                  chevron_right
                </span>
              </Link>
            </div>

            {orders.length === 0 ? (
              <EmptyState
                icon="receipt_long"
                title="No orders yet"
                message="Share your products and your first order will appear here."
                action={
                  <PrimaryButton
                    as="link"
                    to="/reseller/catalog"
                    icon="storefront"
                  >
                    Browse catalog
                  </PrimaryButton>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                {orders.map((o) => (
                  <Link
                    key={o._id}
                    to="/reseller/orders"
                    className="flex items-center justify-between gap-3 border-b border-gray-50 p-3 no-underline last:border-b-0 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-semibold text-gray-900">
                        #{o.orderId}
                      </p>
                      <p className="m-0 text-[11px] text-gray-500">
                        {formatDate(o.createdAt)} · {o.items?.length || 0}{" "}
                        item(s)
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="m-0 text-sm font-bold text-gray-900">
                        {formatPrice(o.totalAmount)}
                      </p>
                      {o.commission && (
                        <p className="m-0 text-[11px] font-semibold text-emerald-600">
                          +{formatPrice(o.commission.netCommission)}
                        </p>
                      )}
                    </div>
                    <StatusPill status={o.orderStatus} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Top products */}
          {analytics?.topProducts?.length > 0 && (
            <div className="mt-6">
              <h2 className="m-0 mb-2 text-base font-bold text-gray-900">
                Your top products
              </h2>
              <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
                {analytics.topProducts.slice(0, 8).map((p) => (
                  <div
                    key={p._id}
                    className="w-[150px] shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white"
                  >
                    <div className="aspect-square bg-white">
                      <img
                        src={p.product?.images?.[0]}
                        alt={p.product?.name || "Product"}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                    <div className="p-2">
                      <p
                        className="m-0 mb-1 text-[11px] font-semibold text-gray-800"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {p.product?.name}
                      </p>
                      <p className="m-0 text-[11px] text-gray-500">
                        {p.stats?.unitsSold || 0} sold ·{" "}
                        <span className="font-bold text-emerald-600">
                          {formatPrice(p.stats?.earnings || 0)}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </ResellerLayout>
  );
};

export default ResellerDashboard;
