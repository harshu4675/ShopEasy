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
  Pagination,
  RowsSkeleton,
  ResellerGate,
} from "../../components/reseller/ResellerUI";

/**
 * Customers acquired through this reseller's links.
 * Phone numbers arrive masked from the API — a reseller can recognise a repeat
 * buyer without being handed an exportable contact list.
 */
const ResellerCustomers = () => {
  const {
    reseller,
    loading: profileLoading,
    isApproved,
    status,
  } = useReseller();

  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isApproved) return;
    setLoading(true);
    try {
      const { data } = await resellerAPI.getCustomers({ page, limit: 20 });
      setCustomers(data.data || []);
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

  if (profileLoading) {
    return (
      <ResellerLayout title="Customers">
        <RowsSkeleton rows={6} height={70} />
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
      title="Customers"
      subtitle={`${pagination?.total ?? 0} customer(s) from your store`}
    >
      {loading ? (
        <RowsSkeleton rows={6} height={70} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon="diversity_3"
          title="No customers yet"
          message="People who buy through your links will appear here."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            {customers.map((c) => {
              const repeat = c.orders > 1;
              return (
                <div
                  key={c._id}
                  className="flex items-center gap-3 border-b border-gray-50 p-3 last:border-b-0"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{
                      background: repeat
                        ? "linear-gradient(135deg, #10b981, #059669)"
                        : "linear-gradient(135deg, #831843, #ec4899)",
                    }}
                  >
                    {(c.name || "?").charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="m-0 truncate text-sm font-semibold text-gray-900">
                        {c.name || "Customer"}
                      </p>
                      {repeat && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                          Repeat
                        </span>
                      )}
                    </div>
                    <p className="m-0 text-[11px] text-gray-500">
                      {c.phone} · Last order {formatDate(c.lastOrder)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="m-0 text-sm font-bold text-gray-900">
                      {formatPrice(c.spent || 0)}
                    </p>
                    <p className="m-0 text-[10px] text-gray-500">
                      {c.orders} order(s) · {c.delivered || 0} delivered
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <span
              style={matIcon}
              className="shrink-0 text-[18px] text-blue-600"
            >
              info
            </span>
            <p className="m-0 text-[11px] leading-relaxed text-blue-800">
              Contact numbers are partially masked to protect customer privacy.
              Order-related communication is handled by Talish Clothes support.
            </p>
          </div>

          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}
    </ResellerLayout>
  );
};

export default ResellerCustomers;
