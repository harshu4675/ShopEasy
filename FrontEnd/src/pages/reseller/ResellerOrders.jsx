import React, { useCallback, useEffect, useState } from "react";
import {
  resellerAPI,
  formatPrice,
  formatDate,
  getErrorMessage,
} from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import useReseller from "../../hooks/useReseller";
import ResellerLayout from "../../components/reseller/ResellerLayout";
import {
  EmptyState,
  StatusPill,
  Pagination,
  RowsSkeleton,
  ResellerGate,
  PrimaryButton,
} from "../../components/reseller/ResellerUI";

/** Reseller-facing order pipeline vocabulary. */
const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
];

const ResellerOrders = () => {
  const {
    reseller,
    loading: profileLoading,
    isApproved,
    status,
  } = useReseller();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!isApproved) return;
    setLoading(true);
    try {
      const { data } = await resellerAPI.getOrders({
        page,
        limit: 20,
        status: tab === "all" ? undefined : tab,
      });
      setOrders(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }, [isApproved, page, tab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const exportCsv = async () => {
    try {
      const res = await resellerAPI.exportReport({ type: "orders" });
      const url = URL.createObjectURL(
        new Blob([res.data], { type: "text/csv" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `reseller-orders-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Report downloaded", "success");
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  };

  if (profileLoading) {
    return (
      <ResellerLayout title="Orders">
        <RowsSkeleton rows={6} height={90} />
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

  return (
    <ResellerLayout
      title="Orders"
      subtitle={`${pagination?.total ?? 0} order(s) from your store`}
      action={
        <PrimaryButton
          onClick={exportCsv}
          icon="download"
          className="!bg-white/15 backdrop-blur-md"
        >
          Export CSV
        </PrimaryButton>
      }
    >
      <div className="scrollbar-none mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border-none px-4 py-1.5 text-xs font-semibold transition-all ${
              tab === t.key
                ? "text-white shadow-md"
                : "bg-gray-100 text-gray-700"
            }`}
            style={
              tab === t.key
                ? { background: "linear-gradient(135deg, #831843, #ec4899)" }
                : undefined
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <RowsSkeleton rows={6} height={90} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title={tab === "all" ? "No orders yet" : `No ${tab} orders`}
          message="Orders placed through your shared links will show up here."
        />
      ) : (
        <>
          <div className="space-y-2">
            {orders.map((o) => (
              <div
                key={o._id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
              >
                <button
                  onClick={() => setExpanded(expanded === o._id ? null : o._id)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 border-none bg-transparent p-3 text-left"
                  aria-expanded={expanded === o._id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        #{o.orderId}
                      </span>
                      <StatusPill status={o.orderStatus} />
                    </div>
                    <p className="m-0 text-[11px] text-gray-500">
                      {formatDate(o.createdAt)} · {o.items?.length || 0} item(s)
                      · {o.shippingAddress?.city || "—"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="m-0 text-sm font-bold text-gray-900">
                      {formatPrice(o.totalAmount)}
                    </p>
                    {o.commission && (
                      <p
                        className={`m-0 text-[11px] font-bold ${
                          o.commission.status === "reversed"
                            ? "text-rose-500 line-through"
                            : "text-emerald-600"
                        }`}
                      >
                        +{formatPrice(o.commission.netCommission)}
                      </p>
                    )}
                  </div>

                  <span
                    style={matIcon}
                    className={`shrink-0 text-[20px] text-gray-400 transition-transform ${
                      expanded === o._id ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                {expanded === o._id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-3">
                    <div className="mb-3 space-y-2">
                      {o.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {item.image && (
                            <img
                              src={item.image}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-10 w-10 rounded bg-white object-contain"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate text-[11px] font-semibold text-gray-800">
                              {item.name}
                            </p>
                            <p className="m-0 text-[10px] text-gray-500">
                              Qty {item.quantity}
                              {item.size ? ` · ${item.size}` : ""}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-gray-900">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {o.commission && (
                      <div className="rounded-lg bg-white p-2.5">
                        <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                          Commission breakdown
                        </p>
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex justify-between text-gray-600">
                            <span>Selling amount</span>
                            <span>
                              {formatPrice(o.commission.sellingAmount ?? 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Gross margin</span>
                            <span>
                              {formatPrice(o.commission.grossMargin ?? 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-rose-500">
                            <span>Platform fee</span>
                            <span>
                              −{formatPrice(o.commission.platformFee ?? 0)}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between border-t border-gray-100 pt-1.5 font-bold text-emerald-600">
                            <span>Your profit</span>
                            <span>
                              {formatPrice(o.commission.netCommission ?? 0)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <StatusPill status={o.commission.status} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}
    </ResellerLayout>
  );
};

export default ResellerOrders;
