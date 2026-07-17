import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const MobileBottomNav = () => {
  const location = useLocation();

  useEffect(() => {
    const fontId = "mobile-bottomnav-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const items = [
    { to: "/", icon: "home", label: "Home", match: (p) => p === "/" },
    {
      to: "/coupons",
      icon: "local_offer",
      label: "Offers",
      match: (p) => p.startsWith("/coupons"),
    },
    {
      to: "/categories",
      icon: "category",
      label: "Categories",
      match: (p) => p.startsWith("/categories"),
    },
    {
      to: "/products",
      icon: "shopping_bag",
      label: "Shop",
      match: (p) => p.startsWith("/products") && !p.includes("/product/"),
    },
    {
      to: "/my-orders",
      icon: "receipt_long",
      label: "Orders",
      match: (p) => p.startsWith("/my-orders"),
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{
        fontFamily: "'Poppins', sans-serif",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="grid grid-cols-5 px-1 py-1">
        {items.map((item, i) => {
          const active = item.match(location.pathname);
          return (
            <Link
              key={i}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 no-underline transition-colors ${
                active ? "text-pink-600" : "text-gray-500"
              }`}
            >
              <span
                style={matIcon}
                className={`text-[24px] ${active ? "text-pink-600" : "text-gray-500"}`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-t-full bg-pink-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
