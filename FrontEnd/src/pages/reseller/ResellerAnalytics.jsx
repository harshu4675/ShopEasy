import React, { useCallback, useEffect, useMemo, useState } from "react";
import { resellerAPI, formatPrice, getErrorMessage } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import useReseller from "../../hooks/useReseller";
import ResellerLayout from "../../components/reseller/ResellerLayout";
import {
  LineChart,
  BarChart,
  DonutChart,
} from "../../components/reseller/Charts";
import {
  StatCard,
  EmptyState,
  PrimaryButton,
  StatsSkeleton,
  ResellerGate,
} from "../../components/reseller/ResellerUI";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const compactMoney = (v) =>
  v >= 100000
    ? `₹${(v / 100000).toFixed(1)}L`
    : v >= 1000
      ? `₹${(v / 1000).toFixed(1)}k`
      : `₹${Math.round(v)}`;

const ResellerAnalytics = () => {
  const {
    reseller,
    loading: profileLoading,
    isApproved,
    status,
  } = useReseller();

  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState("earnings");

  const load = useCallback(async () => {
    if (!isApproved) return;
    setLoading(true);
    try {
      const { data } = await resellerAPI.getAnalytics({ days });
      setAnalytics(data.data);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }, [isApproved, days]);

  useEffect(() => {
    load();
  }, [load]);

  const monthly = useMemo(
    () =>
      (analytics?.monthly || []).map((m) => ({
        label: `${MONTHS[m.month - 1]} ${String(m.year).slice(2)}`,
        earnings: m.earnings,
        orders: m.orders,
        revenue: m.revenue,
      })),
    [analytics],
  );

  const exportReport = async (type) => {
    try {
      const res = await resellerAPI.exportReport({ type });
      const url = URL.createObjectURL(
        new Blob([res.data], { type: "text/csv" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `reseller-${type}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Report downloaded", "success");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  };

  if (profileLoading) {
    return (
      <ResellerLayout title="Analytics">
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

  const t = analytics?.totals;

  return (
    <ResellerLayout
      title="Analytics"
      subtitle="Understand what's selling and who's buying"
      action={
        <PrimaryButton
          onClick={() => exportReport("commissions")}
          icon="download"
          className="!bg-white/15 backdrop-blur-md"
        >
          Export
        </PrimaryButton>
      }
    >
      <div className="mb-4 flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={`cursor-pointer rounded-full border-none px-4 py-1.5 text-xs font-semibold transition-all ${
              days === r.days
                ? "text-white shadow-md"
                : "bg-gray-100 text-gray-700"
            }`}
            style={
              days === r.days
                ? { background: "linear-gradient(135deg, #831843, #ec4899)" }
                : undefined
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <>
          <StatsSkeleton />
          <div className="mt-4 h-[220px] animate-pulse rounded-xl bg-gray-200" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-3 max-md:grid-cols-2">
            <StatCard
              icon="visibility"
              label="Clicks"
              value={t?.clicks}
              gradient="linear-gradient(135deg, #06b6d4, #0891b2)"
            />
            <StatCard
              icon="shopping_bag"
              label="Orders"
              value={t?.orders}
              gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
            />
            <StatCard
              icon="inventory"
              label="Units sold"
              value={t?.unitsSold}
              gradient="linear-gradient(135deg, #0ea5e9, #0284c7)"
            />
            <StatCard
              icon="payments"
              label="Revenue"
              value={t?.revenue}
              money
              gradient="linear-gradient(135deg, #f59e0b, #d97706)"
            />
            <StatCard
              icon="savings"
              label="Earnings"
              value={t?.earnings}
              money
              gradient="linear-gradient(135deg, #10b981, #059669)"
            />
          </div>

          {/* Trend */}
          <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 text-sm font-bold text-gray-900">
                Performance trend
              </h2>
              <div className="flex gap-1">
                {[
                  { key: "earnings", label: "Earnings" },
                  { key: "revenue", label: "Revenue" },
                  { key: "orders", label: "Orders" },
                  { key: "clicks", label: "Clicks" },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                      metric === m.key
                        ? "border-pink-300 bg-pink-50 text-pink-700"
                        : "border-gray-200 bg-white text-gray-500"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <LineChart
              data={analytics?.series || []}
              yKey={metric}
              height={200}
              label={metric}
            />
          </div>

          {/* Conversion + monthly */}
          <div className="mt-4 grid grid-cols-3 gap-3 max-md:grid-cols-1">
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <h2 className="m-0 mb-3 text-sm font-bold text-gray-900">
                Conversion
              </h2>
              <DonutChart
                value={t?.conversionRate || 0}
                max={100}
                label={`${t?.conversionRate ?? 0}%`}
                sublabel="clicks → orders"
              />
              <p className="m-0 mt-2 text-center text-[11px] text-gray-500">
                Avg order {formatPrice(t?.averageOrderValue || 0)}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-gray-100 bg-white p-4 max-md:col-span-1">
              <h2 className="m-0 mb-3 text-sm font-bold text-gray-900">
                Monthly earnings
              </h2>
              <BarChart
                data={monthly}
                labelKey="label"
                valueKey="earnings"
                formatter={compactMoney}
              />
            </div>
          </div>

          {/* Top products */}
          <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
            <h2 className="m-0 mb-3 text-sm font-bold text-gray-900">
              Top products
            </h2>
            {!analytics?.topProducts?.length ? (
              <p className="m-0 py-6 text-center text-xs text-gray-400">
                No sales data yet
              </p>
            ) : (
              <div className="space-y-2">
                {analytics.topProducts.map((p, i) => (
                  <div key={p._id} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-400">
                      {i + 1}
                    </span>
                    <img
                      src={p.product?.images?.[0]}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 shrink-0 rounded-lg bg-gray-50 object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-xs font-semibold text-gray-800">
                        {p.product?.name}
                      </p>
                      <p className="m-0 text-[10px] text-gray-500">
                        {p.stats?.unitsSold || 0} sold · {p.stats?.clicks || 0}{" "}
                        clicks
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-emerald-600">
                      {formatPrice(p.stats?.earnings || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top customers */}
          <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
            <h2 className="m-0 mb-3 text-sm font-bold text-gray-900">
              Top customers
            </h2>
            {!analytics?.topCustomers?.length ? (
              <p className="m-0 py-6 text-center text-xs text-gray-400">
                No customers yet
              </p>
            ) : (
              <div className="space-y-2">
                {analytics.topCustomers.map((c, i) => (
                  <div key={c._id || i} className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg, #831843, #ec4899)",
                      }}
                    >
                      {(c.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-xs font-semibold text-gray-800">
                        {c.name || "Customer"}
                      </p>
                      <p className="m-0 text-[10px] text-gray-500">
                        {c.orders} order(s) · {c.phone}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-gray-900">
                      {formatPrice(c.spent || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["commissions", "orders", "transactions"].map((type) => (
              <button
                key={type}
                onClick={() => exportReport(type)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-50"
              >
                <span style={matIcon} className="text-[16px]">
                  download
                </span>
                Export {type}
              </button>
            ))}
          </div>
        </>
      )}
    </ResellerLayout>
  );
};

export default ResellerAnalytics;
