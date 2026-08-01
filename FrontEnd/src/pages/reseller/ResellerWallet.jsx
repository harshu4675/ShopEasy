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
  StatCard,
  StatusPill,
  EmptyState,
  PrimaryButton,
  Pagination,
  RowsSkeleton,
  StatsSkeleton,
  ResellerGate,
} from "../../components/reseller/ResellerUI";

/** Withdrawal request modal. */
const WithdrawModal = ({ wallet, reseller, onClose, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(reseller.payout?.method || "UPI");
  const [upiId, setUpiId] = useState(reseller.payout?.upiId || "");
  const [accountHolderName, setAccountHolderName] = useState(
    reseller.payout?.accountHolderName || "",
  );
  const [accountNumber, setAccountNumber] = useState(
    reseller.payout?.accountNumber || "",
  );
  const [ifscCode, setIfscCode] = useState(reseller.payout?.ifscCode || "");
  const [bankName, setBankName] = useState(reseller.payout?.bankName || "");
  const [submitting, setSubmitting] = useState(false);

  const max = wallet?.availableBalance || 0;
  const min = wallet?.minWithdrawal || 100;
  const value = Number(amount) || 0;

  const invalid =
    value < min ||
    value > max ||
    (method === "UPI" ? !upiId : !accountNumber || !ifscCode);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resellerAPI.requestWithdrawal({
        amount: value,
        method,
        ...(method === "UPI"
          ? { upiId }
          : {
              accountHolderName,
              accountNumber,
              ifscCode: ifscCode.toUpperCase(),
              bankName,
            }),
      });
      showToast("Withdrawal requested", "success");
      onSuccess();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-100";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Request withdrawal"
    >
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-base font-bold text-gray-900">
            Request withdrawal
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-gray-100 text-gray-600"
          >
            <span style={matIcon} className="text-[18px]">
              close
            </span>
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-center">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Available balance
          </p>
          <p className="m-0 text-2xl font-extrabold text-emerald-700">
            {formatPrice(max)}
          </p>
        </div>

        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          Amount (min {formatPrice(min)})
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Up to ${max}`}
          min={min}
          max={max}
          className={inputCls}
        />
        <div className="mb-4 mt-2 flex gap-2">
          {[500, 1000, 2000]
            .filter((v) => v <= max)
            .map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className="flex-1 cursor-pointer rounded-lg border border-gray-200 bg-white py-1.5 text-[11px] font-semibold text-gray-600"
              >
                ₹{v}
              </button>
            ))}
          {max >= min && (
            <button
              type="button"
              onClick={() => setAmount(String(max))}
              className="flex-1 cursor-pointer rounded-lg border border-pink-200 bg-pink-50 py-1.5 text-[11px] font-bold text-pink-700"
            >
              All
            </button>
          )}
        </div>

        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          Payout method
        </label>
        <div className="mb-4 flex gap-2">
          {["UPI", "BANK"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 cursor-pointer rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all ${
                method === m
                  ? "border-pink-500 bg-pink-50 text-pink-700"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {m === "UPI" ? "UPI" : "Bank Transfer"}
            </button>
          ))}
        </div>

        {method === "UPI" ? (
          <input
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value.trim())}
            placeholder="yourname@bank"
            autoCapitalize="none"
            className={inputCls}
          />
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="Account holder name"
              className={inputCls}
            />
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(e.target.value.replace(/\D/g, ""))
              }
              placeholder="Account number"
              className={inputCls}
            />
            <input
              type="text"
              value={ifscCode}
              onChange={(e) =>
                setIfscCode(e.target.value.toUpperCase().slice(0, 11))
              }
              placeholder="IFSC code"
              className={inputCls}
            />
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Bank name (optional)"
              className={inputCls}
            />
          </div>
        )}

        <p className="m-0 mb-3 mt-3 text-[11px] text-gray-400">
          Payouts are processed within 3 working days.
        </p>

        <PrimaryButton
          type="submit"
          disabled={invalid || submitting}
          loading={submitting}
          icon="send"
          className="w-full"
        >
          {submitting
            ? "Requesting…"
            : `Withdraw ${value ? formatPrice(value) : ""}`}
        </PrimaryButton>
      </form>
    </div>
  );
};

const ResellerWallet = () => {
  const {
    reseller,
    loading: profileLoading,
    isApproved,
    status,
  } = useReseller();

  const [wallet, setWallet] = useState(null);
  const [tab, setTab] = useState("transactions");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!isApproved) return;
    try {
      const { data } = await resellerAPI.getWallet();
      setWallet(data.data);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }, [isApproved]);

  const loadRows = useCallback(async () => {
    if (!isApproved) return;
    setRowsLoading(true);
    try {
      const fetcher =
        tab === "transactions"
          ? resellerAPI.getTransactions
          : resellerAPI.getWithdrawals;
      const { data } = await fetcher({ page, limit: 20 });
      setRows(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setRowsLoading(false);
    }
  }, [isApproved, tab, page]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const cancelWithdrawal = async (id) => {
    try {
      await resellerAPI.cancelWithdrawal(id);
      showToast("Withdrawal cancelled", "success");
      loadWallet();
      loadRows();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    }
  };

  if (profileLoading) {
    return (
      <ResellerLayout title="Wallet">
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

  const canWithdraw =
    (wallet?.availableBalance || 0) >= (wallet?.minWithdrawal || 100);

  return (
    <ResellerLayout
      title="Wallet"
      subtitle="Track your earnings and request payouts"
      action={
        <PrimaryButton
          onClick={() => setShowModal(true)}
          disabled={!canWithdraw}
          icon="payments"
          className="!bg-white/15 backdrop-blur-md"
        >
          Withdraw
        </PrimaryButton>
      }
    >
      {loading ? (
        <StatsSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-3 gap-3 max-md:grid-cols-2">
          <StatCard
            icon="account_balance_wallet"
            label="Available"
            value={wallet?.availableBalance}
            money
            sub="Withdrawable now"
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
            icon="lock"
            label="Locked"
            value={wallet?.lockedBalance}
            money
            sub={`${wallet?.pendingWithdrawals || 0} request(s) in progress`}
            gradient="linear-gradient(135deg, #64748b, #475569)"
          />
          <StatCard
            icon="today"
            label="Today"
            value={wallet?.todayEarnings}
            money
            gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
          />
          <StatCard
            icon="calendar_month"
            label="This month"
            value={wallet?.monthEarnings}
            money
            gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
          />
          <StatCard
            icon="savings"
            label="Lifetime"
            value={wallet?.lifetimeEarnings}
            money
            sub={`${formatPrice(wallet?.totalWithdrawn || 0)} withdrawn`}
            gradient="linear-gradient(135deg, #831843, #ec4899)"
          />
        </div>
      )}

      {!canWithdraw && !loading && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
          <p className="m-0 text-xs text-amber-800">
            <span style={matIcon} className="mr-1 align-middle text-[16px]">
              info
            </span>
            Minimum withdrawal is {formatPrice(wallet?.minWithdrawal || 100)}.
            Keep selling to unlock payouts.
          </p>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-3 flex gap-1.5">
          {[
            { key: "transactions", label: "Transactions" },
            { key: "withdrawals", label: "Withdrawals" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`cursor-pointer rounded-full border-none px-4 py-1.5 text-xs font-semibold transition-all ${
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

        {rowsLoading ? (
          <RowsSkeleton rows={5} height={64} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={tab === "transactions" ? "receipt" : "payments"}
            title={
              tab === "transactions"
                ? "No transactions yet"
                : "No withdrawals yet"
            }
            message={
              tab === "transactions"
                ? "Your commission entries will appear here."
                : "Request a payout once you have a withdrawable balance."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            {tab === "transactions"
              ? rows.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center gap-3 border-b border-gray-50 p-3 last:border-b-0"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background:
                          t.direction === "credit" ? "#dcfce7" : "#fee2e2",
                      }}
                    >
                      <span
                        style={matIcon}
                        className={`text-[18px] ${
                          t.direction === "credit"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {t.direction === "credit"
                          ? "arrow_downward"
                          : "arrow_upward"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-xs font-semibold text-gray-900">
                        {t.description || t.type}
                      </p>
                      <p className="m-0 text-[10px] text-gray-500">
                        {formatDate(t.createdAt)} · {t.type}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`m-0 text-sm font-bold ${
                          t.direction === "credit"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {t.direction === "credit" ? "+" : "−"}
                        {formatPrice(t.amount)}
                      </p>
                      <StatusPill status={t.status} />
                    </div>
                  </div>
                ))
              : rows.map((w) => (
                  <div
                    key={w._id}
                    className="flex items-center gap-3 border-b border-gray-50 p-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-xs font-bold text-gray-900">
                        {w.withdrawalId}
                      </p>
                      <p className="m-0 text-[10px] text-gray-500">
                        {formatDate(w.requestedAt || w.createdAt)} · {w.method}
                        {w.transactionReference
                          ? ` · Ref ${w.transactionReference}`
                          : ""}
                      </p>
                      {w.rejectionReason && (
                        <p className="m-0 mt-0.5 text-[10px] text-rose-600">
                          {w.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="m-0 text-sm font-bold text-gray-900">
                        {formatPrice(w.amount)}
                      </p>
                      <StatusPill status={w.status} />
                    </div>
                    {w.status === "pending" && (
                      <button
                        onClick={() => cancelWithdrawal(w._id)}
                        aria-label="Cancel withdrawal"
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600"
                      >
                        <span style={matIcon} className="text-[16px]">
                          close
                        </span>
                      </button>
                    )}
                  </div>
                ))}
          </div>
        )}

        <Pagination pagination={pagination} onChange={setPage} />
      </div>

      {showModal && (
        <WithdrawModal
          wallet={wallet}
          reseller={reseller}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadWallet();
            setTab("withdrawals");
            loadRows();
          }}
        />
      )}
    </ResellerLayout>
  );
};

export default ResellerWallet;
