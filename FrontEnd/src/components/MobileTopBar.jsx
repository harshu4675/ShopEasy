import React, { useContext, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const MobileTopBar = ({ showBack = false, title = "" }) => {
  const { user } = useContext(AuthContext);
  const { cartCount } = useContext(CartContext) || { cartCount: 0 };
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fontId = "mobile-topbar-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const getUserInitial = () => {
    if (!user) return "";
    return (user.name || user.email || "U").charAt(0).toUpperCase();
  };

  const isHome = location.pathname === "/";

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-100 bg-white px-3"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="flex items-center gap-2">
        {showBack && !isHome ? (
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-gray-800 active:bg-gray-100"
          >
            <span style={matIcon} className="text-[26px]">
              arrow_back
            </span>
          </button>
        ) : user ? (
          <Link
            to="/account"
            aria-label="Account"
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-md no-underline"
            style={{
              background: "linear-gradient(135deg, #831843, #ec4899)",
            }}
          >
            {getUserInitial()}
          </Link>
        ) : (
          <Link
            to="/login"
            aria-label="Login"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-gray-700 no-underline"
          >
            <span style={matIcon} className="text-[22px]">
              person
            </span>
          </Link>
        )}

        {title && (
          <h1 className="m-0 text-base font-semibold uppercase tracking-wide text-gray-800">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Link
          to="/wishlist"
          aria-label="Wishlist"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 no-underline active:bg-gray-100"
        >
          <span style={matIcon} className="text-[24px]">
            favorite_border
          </span>
        </Link>

        <Link
          to="/cart"
          aria-label="Cart"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 no-underline active:bg-gray-100"
        >
          <span style={matIcon} className="text-[24px]">
            shopping_cart
          </span>
          {cartCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-bold leading-none text-white"
              style={{
                background: "linear-gradient(135deg, #ec4899, #be185d)",
              }}
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};

export default MobileTopBar;
