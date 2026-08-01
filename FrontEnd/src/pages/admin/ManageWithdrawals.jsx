import React, { useCallback, useEffect, useState } from "react";
import {
  resellerAdminAPI,
  formatPrice,
  formatDateTime,
  getErrorMessage,
} from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import useGoogleFonts from "../../hooks/useGoogleFonts";
import {
  StatCard,
  StatusPill,
  EmptyState,
  Pagination,
  RowsSkeleton,
} from "../../components/reseller/ResellerUI";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

/** Collects the bank/UPI reference when settling a payout. */
const SettleModal = ({ withdrawal, onClose, onConfirm }) => {
  const [reference, setReference] = useState("");
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
        <h3 className="m-0 mb-1 text-base font-bold text-gray-900">
          Mark as paid
        </h3>
        <p className="m-0 mb-3 text-xs text-gray-500">
          {formatPrice(withdrawal.netAmount)} to{" "}
          {withdrawal.method === "UPI"
            ? withdrawal.payoutDetails?.upiId
            : `A/C ${withdrawal.payoutDetails?.accountNumber}`}
        </p>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Transaction / UTR reference"
          className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-pink-500"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600"
          >
            Cancel
          </button>
          <button
            disabled={reference.trim().length < 3 || busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm(reference.trim());
              setBusy(false);
            }}
            className="flex-1 cursor-pointer rounded-xl border-none bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Confirm paid"}
          </button>
        </div>
      </div>
    </div>
  );
};

const RejectModal = ({ onClose, onConfirm }) => {
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
        <h3 className="m-0 mb-1 text-base font-bold text-gray-900">
          Reject withdrawal
        </h3>
        <p className="m-0 mb-3 text-xs text-gray-500">
          The amount returns to the reseller's available balance.
        </p>
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
            className="flex-1 cursor-pointer rounded-xl border-none bg-rose-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Working…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ManageWithdrawals = () => {
  useGoogleFonts(
    "admin-withdrawals-fonts",
    "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap",
  );

  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await resellerAdminAPI.getWithdrawals({
        status: tab,
        page,
        limit: 20,
      });
      setRows(data.data || []);
      setPagination(data.pagination);
      setSummary(data.summary || {});
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [tab]);

  const act = async (fn, id, msg, payload) => {
    setBusyId(id);
    try {
      await fn(id, payload);
      showToast(msg, "success");
      setModal(null);
      load();
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
        <h1 className="m-0 text-xl font-extrabold text-gray-900">
          Withdrawals
        </h1>
        <p className="m-0 mt-0.5 text-xs text-gray-500">
          Review and settle reseller payout requests
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
        <StatCard
          icon="pending_actions"
          label="Pending"
          value={summary.pending?.amount || 0}
          money
          sub={`${summary.pending?.count || 0} request(s)`}
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
        />
        <StatCard
          icon="task_alt"
          label="Approved"
          value={summary.approved?.amount || 0}
          money
          sub={`${summary.approved?.count || 0} to pay`}
          gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
        />
        <StatCard
          icon="paid"
          label="Paid"
          value={summary.paid?.amount || 0}
          money
          sub={`${summary.paid?.count || 0} settled`}
          gradient="linear-gradient(135deg, #10b981, #059669)"
        />
        <StatCard
          icon="cancel"
          label="Rejected"
          value={summary.rejected?.amount || 0}
          money
          sub={`${summary.rejected?.count || 0} declined`}
          gradient="linear-gradient(135deg, #ef4444, #dc2626)"
        />
      </div>

      <div className="scrollbar-none mt-5 flex gap-1.5 overflow-x-auto pb-1">
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

      <div className="mt-3">
        {loading ? (
          <RowsSkeleton rows={5} height={100} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="payments"
            title={`No ${tab === "all" ? "" : tab} withdrawals`}
            message="Payout requests from resellers will appear here."
          />
        ) : (
          <>
            <div className="space-y-3">
              {rows.map((w) => (
                <div
                  key={w._id}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {w.withdrawalId}
                        </span>
                        <StatusPill status={w.status} />
                        {w.reseller?.riskScore > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                            Risk {w.reseller.riskScore}
                          </span>
                        )}
                      </div>
                      <p className="m-0 text-[11px] text-gray-500">
                        {w.reseller?.storeName} · {w.user?.name} ·{" "}
                        {w.user?.phone}
                      </p>
                      <p className="m-0 text-[11px] text-gray-400">
                        Requested {formatDateTime(w.requestedAt || w.createdAt)}
                      </p>

                      <div className="mt-2 rounded-lg bg-gray-50 p-2 text-[11px]">
                        <p className="m-0 font-semibold text-gray-700">
                          {w.method === "UPI" ? "UPI" : "Bank transfer"}
                        </p>
                        {w.method === "UPI" ? (
                          <p className="m-0 font-mono text-gray-600">
                            {w.payoutDetails?.upiId}
                          </p>
                        ) : (
                          <p className="m-0 font-mono text-gray-600">
                            {w.payoutDetails?.accountHolderName} ·{" "}
                            {w.payoutDetails?.accountNumber} ·{" "}
                            {w.payoutDetails?.ifscCode}
                          </p>
                        )}
                      </div>

                      {w.transactionReference && (
                        <p className="m-0 mt-1 text-[11px] text-emerald-600">
                          Paid · Ref {w.transactionReference}
                        </p>
                      )}
                      {w.rejectionReason && (
                        <p className="m-0 mt-1 text-[11px] text-rose-600">
                          {w.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="m-0 text-lg font-extrabold text-gray-900">
                        {formatPrice(w.amount)}
                      </p>

                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        {w.status === "pending" && (
                          <>
                            <button
                              disabled={busyId === w._id}
                              onClick={() =>
                                act(
                                  resellerAdminAPI.approveWithdrawal,
                                  w._id,
                                  "Withdrawal approved",
                                  {},
                                )
                              }
                              className="cursor-pointer rounded-lg border-none bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setModal({ type: "reject", w })}
                              className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {["approved", "processing"].includes(w.status) && (
                          <>
                            <button
                              onClick={() => setModal({ type: "settle", w })}
                              className="cursor-pointer rounded-lg border-none bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                            >
                              <span
                                style={matIcon}
                                className="mr-1 align-middle text-[14px]"
                              >
                                check_circle
                              </span>
                              Mark paid
                            </button>
                            <button
                              onClick={() => setModal({ type: "reject", w })}
                              className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination pagination={pagination} onChange={setPage} />
          </>
        )}
      </div>

      {modal?.type === "settle" && (
        <SettleModal
          withdrawal={modal.w}
          onClose={() => setModal(null)}
          onConfirm={(transactionReference) =>
            act(
              resellerAdminAPI.markWithdrawalPaid,
              modal.w._id,
              "Withdrawal settled",
              { transactionReference },
            )
          }
        />
      )}
      {modal?.type === "reject" && (
        <RejectModal
          onClose={() => setModal(null)}
          onConfirm={(reason) =>
            act(
              resellerAdminAPI.rejectWithdrawal,
              modal.w._id,
              "Withdrawal rejected",
              { reason },
            )
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

export default ManageWithdrawals;
