import React, { useCallback, useEffect, useState } from "react";
import {
  resellerAdminAPI,
  formatPrice,
  formatDate,
  getErrorMessage,
} from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import useGoogleFonts from "../../hooks/useGoogleFonts";
import useDebounce from "../../hooks/useDebounce";
import {
  StatCard,
  StatusPill,
  EmptyState,
  Pagination,
  RowsSkeleton,
  StatsSkeleton,
} from "../../components/reseller/ResellerUI";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

/** Prompt for actions that require a written reason. */
const ReasonModal = ({
  title,
  confirmLabel,
  tone = "rose",
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="m-0 mb-3 text-base font-bold text-gray-900">{title}</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (visible to the reseller)"
          rows={3}
          className="w-full resize-none rounded-xl border-2 border-gray-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600"
          >
            Cancel
          </button>
          <button
            disabled={reason.trim().length < 3 || busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm(reason.trim());
              setBusy(false);
            }}
            className={`flex-1 cursor-pointer rounded-xl border-none py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
              tone === "rose" ? "bg-rose-600" : "bg-amber-600"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ManageResellers = () => {
  useGoogleFonts(
    "admin-resellers-fonts",
    "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap",
  );

  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const loadStats = useCallback(async () => {
    try {
      const [statsRes, boardRes] = await Promise.all([
        resellerAdminAPI.getStats(),
        resellerAdminAPI.getLeaderboard({ limit: 5 }),
      ]);
      setStats(statsRes.data.data);
      setLeaderboard(boardRes.data.data || []);
    } catch {
      /* stats are supplementary */
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await resellerAdminAPI.list({
        status: tab,
        search: debouncedSearch || undefined,
        page,
        limit: 20,
      });
      setRows(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);
  useEffect(() => {
    loadRows();
  }, [loadRows]);
  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch]);

  const act = async (fn, id, successMsg, payload) => {
    setBusyId(id);
    try {
      await fn(id, payload);
      showToast(successMsg, "success");
      loadRows();
      loadStats();
      setModal(null);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="p-4 max-md:p-3"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="mb-4">
        <h1 className="m-0 text-xl font-extrabold text-gray-900">Resellers</h1>
        <p className="m-0 mt-0.5 text-xs text-gray-500">
          Review applications, manage commissions and monitor risk
        </p>
      </div>

      {!stats ? (
        <StatsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
          <StatCard
            icon="pending_actions"
            label="Pending"
            value={stats.resellers?.pending || 0}
            sub="Awaiting review"
            gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          />
          <StatCard
            icon="verified"
            label="Approved"
            value={stats.resellers?.approved || 0}
            sub={`${stats.totalResellers} total`}
            gradient="linear-gradient(135deg, #10b981, #059669)"
          />
          <StatCard
            icon="payments"
            label="Payouts due"
            value={stats.pendingWithdrawals?.amount || 0}
            money
            sub={`${stats.pendingWithdrawals?.count || 0} request(s)`}
            gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
          />
          <StatCard
            icon="savings"
            label="Platform fees"
            value={stats.commissions?.platformFee || 0}
            money
            sub={`${stats.commissions?.orders || 0} orders`}
            gradient="linear-gradient(135deg, #831843, #ec4899)"
          />
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
          <h2 className="m-0 mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <span style={matIcon} className="text-[18px] text-amber-500">
              leaderboard
            </span>
            Top performers
          </h2>
          <div className="space-y-2">
            {leaderboard.map((r) => (
              <div key={r._id} className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-bold text-gray-400">
                  {r.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-xs font-semibold text-gray-800">
                    {r.storeName}
                  </p>
                  <p className="m-0 text-[10px] text-gray-500">
                    {r.user?.name} · {r.stats?.totalOrders || 0} orders
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600">
                  {formatPrice(r.stats?.lifetimeEarnings || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 cursor-pointer rounded-full border-none px-4 py-1.5 text-xs font-semibold transition-all ${
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
        <div className="ml-auto flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-3 py-2 focus-within:border-pink-500 max-md:ml-0">
          <span style={matIcon} className="text-[18px] text-gray-400">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store or code…"
            className="flex-1 border-none bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <RowsSkeleton rows={5} height={110} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="storefront"
            title={`No ${tab === "all" ? "" : tab} resellers`}
            message="Applications will appear here as they come in."
          />
        ) : (
          <>
            <div className="space-y-3">
              {rows.map((r) => (
                <div
                  key={r._id}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="m-0 text-sm font-bold text-gray-900">
                          {r.storeName}
                        </h3>
                        <StatusPill status={r.status} />
                        {r.riskScore > 0 && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              r.riskScore >= 50
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            Risk {r.riskScore}
                          </span>
                        )}
                      </div>
                      <p className="m-0 text-[11px] text-gray-500">
                        {r.user?.name} · {r.user?.phone} · Code {r.resellerCode}
                      </p>
                      <p className="m-0 text-[11px] text-gray-400">
                        Applied {formatDate(r.appliedAt || r.createdAt)} ·{" "}
                        {r.commissionRate}% commission · max{" "}
                        {r.maxMarginPercent}% margin
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                        <span className="text-gray-600">
                          <b>{r.stats?.totalOrders || 0}</b> orders
                        </span>
                        <span className="text-gray-600">
                          <b>{formatPrice(r.stats?.totalSales || 0)}</b> sales
                        </span>
                        <span className="text-emerald-600">
                          <b>{formatPrice(r.stats?.lifetimeEarnings || 0)}</b>{" "}
                          earned
                        </span>
                        <span className="text-gray-600">
                          <b>{r.stats?.productsListed || 0}</b> products
                        </span>
                      </div>

                      {r.statusReason && (
                        <p className="m-0 mt-1 text-[11px] italic text-gray-500">
                          “{r.statusReason}”
                        </p>
                      )}

                      {r.fraudFlags?.length > 0 && (
                        <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 p-2">
                          {r.fraudFlags.map((f, i) => (
                            <p
                              key={i}
                              className="m-0 text-[10px] font-medium text-rose-700"
                            >
                              <span style={matIcon} className="mr-1 align-middle text-[16px]">warning</span>{f.note}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {r.status === "pending" && (
                        <>
                          <button
                            disabled={busyId === r._id}
                            onClick={() =>
                              act(
                                resellerAdminAPI.approve,
                                r._id,
                                "Reseller approved",
                                {},
                              )
                            }
                            className="cursor-pointer rounded-lg border-none bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              setModal({
                                type: "reject",
                                id: r._id,
                                title: `Reject ${r.storeName}?`,
                              })
                            }
                            className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <button
                          onClick={() =>
                            setModal({
                              type: "suspend",
                              id: r._id,
                              title: `Suspend ${r.storeName}?`,
                            })
                          }
                          className="cursor-pointer rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700"
                        >
                          Suspend
                        </button>
                      )}
                      {r.status === "suspended" && (
                        <button
                          disabled={busyId === r._id}
                          onClick={() =>
                            act(
                              resellerAdminAPI.reinstate,
                              r._id,
                              "Reseller reinstated",
                            )
                          }
                          className="cursor-pointer rounded-lg border-none bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          Reinstate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination pagination={pagination} onChange={setPage} />
          </>
        )}
      </div>

      {modal?.type === "reject" && (
        <ReasonModal
          title={modal.title}
          confirmLabel="Reject"
          onClose={() => setModal(null)}
          onConfirm={(reason) =>
            act(resellerAdminAPI.reject, modal.id, "Reseller rejected", {
              reason,
            })
          }
        />
      )}
      {modal?.type === "suspend" && (
        <ReasonModal
          title={modal.title}
          confirmLabel="Suspend"
          tone="amber"
          onClose={() => setModal(null)}
          onConfirm={(reason) =>
            act(resellerAdminAPI.suspend, modal.id, "Reseller suspended", {
              reason,
            })
          }
        />
      )}

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ManageResellers;
