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
  Pagination,
  RowsSkeleton,
  StatsSkeleton,
  ResellerGate,
} from "../../components/reseller/ResellerUI";

const ResellerReferrals = () => {
  const {
    reseller,
    loading: profileLoading,
    isApproved,
    status,
  } = useReseller();

  const [referrals, setReferrals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  const load = useCallback(async () => {
    if (!isApproved) return;
    setLoading(true);
    try {
      const { data } = await resellerAPI.getReferrals({ page, limit: 20 });
      setReferrals(data.data || []);
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }, [isApproved, page]);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async (text, tag) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      showToast("Copied", "success");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showToast("Could not copy", "error");
    }
  };

  if (profileLoading) {
    return (
      <ResellerLayout title="Referrals">
        <StatsSkeleton count={3} />
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

  const inviteUrl = summary?.shareUrl;
  const inviteText = `Join me as a reseller on Talish Clothes and start earning! Use my code ${summary?.referralCode}: ${inviteUrl}`;

  return (
    <ResellerLayout
      title="Referrals"
      subtitle={`Earn ${summary?.commissionRate ?? reseller.referralCommissionRate}% of every referral's commission`}
    >
      {loading ? (
        <StatsSkeleton count={3} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
            <StatCard
              icon="group"
              label="Total referrals"
              value={summary?.totalReferrals}
              sub={`${summary?.activeReferrals ?? 0} active`}
              gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
            />
            <StatCard
              icon="savings"
              label="Referral earnings"
              value={summary?.totalEarnings}
              money
              sub="Lifetime"
              gradient="linear-gradient(135deg, #10b981, #059669)"
            />
            <StatCard
              icon="percent"
              label="Your rate"
              value={`${summary?.commissionRate ?? 0}%`}
              sub="Of their commission"
              gradient="linear-gradient(135deg, #831843, #ec4899)"
            />
          </div>

          {/* Invite card */}
          <div
            className="mt-4 rounded-xl p-5 text-white"
            style={{
              background:
                "linear-gradient(135deg, #4a0e2e 0%, #831843 60%, #be185d 100%)",
            }}
          >
            <h2 className="m-0 mb-1 text-base font-bold">Invite & earn</h2>
            <p className="m-0 mb-4 text-xs text-pink-100">
              Share your code. When they start selling, you earn a share of
              every commission they make — forever.
            </p>

            <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-pink-200">
                  Your referral code
                </p>
                <p
                  className="m-0 text-xl font-extrabold tracking-widest"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {summary?.referralCode}
                </p>
              </div>
              <button
                onClick={() => copy(summary?.referralCode, "code")}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-[11px] font-bold text-white"
              >
                <span style={matIcon} className="text-[14px]">
                  {copied === "code" ? "check" : "content_copy"}
                </span>
                {copied === "code" ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-bold text-white no-underline"
              >
                <span style={matIcon} className="text-[16px]">
                  chat
                </span>
                WhatsApp
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(inviteUrl || "")}&text=${encodeURIComponent(inviteText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-[#0088cc] px-4 py-2 text-xs font-bold text-white no-underline"
              >
                <span style={matIcon} className="text-[16px]">
                  send
                </span>
                Telegram
              </a>
              <button
                onClick={() => copy(inviteUrl, "link")}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/30 bg-white/15 px-4 py-2 text-xs font-bold text-white"
              >
                <span style={matIcon} className="text-[16px]">
                  {copied === "link" ? "check" : "link"}
                </span>
                {copied === "link" ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          {/* Referral list */}
          <div className="mt-6">
            <h2 className="m-0 mb-2 text-base font-bold text-gray-900">
              Your network
            </h2>

            {referrals.length === 0 ? (
              <EmptyState
                icon="group_add"
                title="No referrals yet"
                message="Share your code with friends who'd love to sell. You earn from every sale they make."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                {referrals.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center gap-3 border-b border-gray-50 p-3 last:border-b-0"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                      }}
                    >
                      {(r.referee?.storeName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-xs font-semibold text-gray-900">
                        {r.referee?.storeName || "Pending signup"}
                      </p>
                      <p className="m-0 text-[10px] text-gray-500">
                        Joined {formatDate(r.createdAt)} ·{" "}
                        {r.ordersGenerated || 0} order(s)
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="m-0 text-xs font-bold text-emerald-600">
                        {formatPrice(r.totalEarnings || 0)}
                      </p>
                      <StatusPill status={r.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Pagination pagination={pagination} onChange={setPage} />
          </div>
        </>
      )}
    </ResellerLayout>
  );
};

export default ResellerReferrals;
