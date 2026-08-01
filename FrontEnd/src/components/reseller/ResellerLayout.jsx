import React, { memo, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { matIcon } from "../../utils/fonts";
import useGoogleFonts from "../../hooks/useGoogleFonts";

/**
 * Shell for every /reseller/* screen.
 *
 * Reuses the storefront's existing visual language — Poppins, the
 * #831843 → #ec4899 pink gradient, pill nav, rounded cards — so the reseller
 * hub feels like part of the same product rather than a bolted-on module.
 */

const NAV = [
  { to: "/reseller", icon: "dashboard", label: "Dashboard", exact: true },
  { to: "/reseller/catalog", icon: "storefront", label: "Catalog" },
  { to: "/reseller/products", icon: "inventory_2", label: "My Products" },
  { to: "/reseller/orders", icon: "receipt_long", label: "Orders" },
  { to: "/reseller/wallet", icon: "account_balance_wallet", label: "Wallet" },
  { to: "/reseller/analytics", icon: "analytics", label: "Analytics" },
  { to: "/reseller/referrals", icon: "group_add", label: "Referrals" },
  { to: "/reseller/customers", icon: "diversity_3", label: "Customers" },
];

const ResellerLayout = ({ title, subtitle, action, children }) => {
  const { pathname } = useLocation();

  useGoogleFonts(
    "reseller-fonts",
    "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap",
  );

  const items = useMemo(
    () =>
      NAV.map((n) => ({
        ...n,
        active: n.exact ? pathname === n.to : pathname.startsWith(n.to),
      })),
    [pathname],
  );

  return (
    <div
      className="min-h-screen bg-gray-50 pb-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div
        className="px-4 pb-6 pt-5 text-white max-md:px-3"
        style={{
          background:
            "linear-gradient(135deg, #4a0e2e 0%, #831843 50%, #be185d 100%)",
        }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-extrabold max-md:text-xl">
              {title}
            </h1>
            {subtitle && (
              <p className="m-0 mt-1 text-sm text-pink-100 max-md:text-xs">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      </div>

      <nav className="sticky top-0 z-20 border-b border-gray-100 bg-white shadow-sm md:top-0">
        <div className="scrollbar-none mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-3 py-2">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold no-underline transition-all ${
                item.active
                  ? "text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-pink-50 hover:text-pink-600"
              }`}
              style={
                item.active
                  ? { background: "linear-gradient(135deg, #831843, #ec4899)" }
                  : undefined
              }
            >
              <span style={matIcon} className="text-[16px]">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-[1200px] px-4 pt-4 max-md:px-3">
        {children}
      </div>

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default memo(ResellerLayout);
