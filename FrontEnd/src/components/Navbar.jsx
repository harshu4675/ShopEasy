import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { NotificationContext } from "../context/NotificationContext";
import { CartContext } from "../context/CartContext";
import { WishlistContext } from "../context/WishlistContext";
import Logo from "./Logo";
import SearchSuggestions from "./SearchSuggestions";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationContext);
  const { cartCount } = useContext(CartContext);
  const { wishlistCount } = useContext(WishlistContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  useEffect(() => {
    const fontId = "navbar-google-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        desktopSearchRef.current &&
        !desktopSearchRef.current.contains(e.target) &&
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(e.target)
      ) {
        setSearchFocused(false);
      } else if (
        desktopSearchRef.current &&
        !desktopSearchRef.current.contains(e.target) &&
        !mobileSearchRef.current
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getUserName = () => {
    if (!user) return "";
    return user.name || user.email?.split("@")[0] || "User";
  };

  const getUserInitial = () => {
    const name = getUserName();
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  const getFirstName = () => {
    const name = getUserName();
    return name ? name.split(" ")[0] : "User";
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      setMenuOpen(false);
      setUserMenuOpen(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchOpen(false);
      setSearchFocused(false);
    }
  };

  const handleSuggestionSelect = () => {
    setSearchQuery("");
    setSearchOpen(false);
    setSearchFocused(false);
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const categoryLinks = [
    ["Men's Clothing", "Men's Fashion"],
    ["Women's Clothing", "Women's Fashion"],
    ["Kids' Clothing", "Kids' Wear"],
    ["Perfumes", "Perfumes"],
    ["Watches", "Watches"],
    ["Sunglasses", "Sunglasses"],
    ["Bags & Wallets", "Bags & Wallets"],
    ["Jewelry", "Jewelry"],
    ["Footwear", "Footwear"],
    ["Accessories", "Accessories"],
  ];

  const mobileNavLinks = [
    ["/", "home", "Home"],
    ["/products", "shopping_bag", "Shop All"],
    ["/products?category=Men's Clothing", "checkroom", "Men's Fashion"],
    ["/products?category=Women's Clothing", "woman", "Women's Fashion"],
    ["/products?category=Kids' Clothing", "child_care", "Kids' Wear"],
    ["/products?category=Perfumes", "spa", "Perfumes"],
    ["/products?category=Accessories", "diamond", "Accessories"],
    ["/coupons", "local_offer", "Offers"],
  ];

  const IconButton = ({ to, title, icon, count, label }) => (
    <Link
      to={to}
      title={title}
      className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 no-underline transition-all duration-200 hover:bg-pink-50 hover:text-pink-600 max-md:h-10 max-md:w-10"
    >
      <span style={matIcon} className="text-[26px] max-md:text-[24px]">
        {icon}
      </span>
      {count > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-bold leading-none text-white"
          style={{
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
      {label && (
        <span className="absolute -bottom-4 left-1/2 hidden -translate-x-1/2 text-[10px] font-medium text-gray-500 group-hover:text-pink-600 xl:block">
          {label}
        </span>
      )}
    </Link>
  );

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-[1000] h-20 border-b border-gray-100 bg-white shadow-sm max-md:h-[70px] max-[480px]:h-16"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div className="relative mx-auto flex h-full max-w-[1400px] items-center justify-between gap-6 px-5 max-lg:gap-3 max-md:gap-3 max-md:px-4">
          <Logo />

          <ul className="m-0 hidden list-none gap-1 p-0 lg:flex">
            <li>
              <Link
                to="/"
                className="block rounded-lg px-4 py-2.5 text-[15px] font-medium text-gray-700 no-underline transition-all duration-200 hover:bg-pink-50 hover:text-pink-600"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                className="block rounded-lg px-4 py-2.5 text-[15px] font-medium text-gray-700 no-underline transition-all duration-200 hover:bg-pink-50 hover:text-pink-600"
              >
                Shop
              </Link>
            </li>
            <li className="group relative">
              <span className="flex cursor-pointer items-center gap-1 rounded-lg px-4 py-2.5 text-[15px] font-medium text-gray-700 transition-all duration-200 hover:bg-pink-50 hover:text-pink-600">
                Categories
                <span style={matIcon} className="text-[18px]">
                  expand_more
                </span>
              </span>
              <div className="invisible absolute left-0 top-full z-[100] min-w-[240px] translate-y-2 rounded-xl border border-gray-100 bg-white py-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                {categoryLinks.map(([cat, label]) => (
                  <Link
                    key={cat}
                    to={`/products?category=${cat}`}
                    className="block px-5 py-2.5 text-sm text-gray-700 no-underline transition-all duration-200 hover:bg-pink-50 hover:pl-6 hover:text-pink-600"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </li>
            <li>
              <Link
                to="/coupons"
                className="block rounded-lg px-4 py-2.5 text-[15px] font-medium text-gray-700 no-underline transition-all duration-200 hover:bg-pink-50 hover:text-pink-600"
              >
                Offers
              </Link>
            </li>
          </ul>

          <div
            ref={desktopSearchRef}
            className="relative hidden flex-1 lg:block lg:max-w-[420px]"
          >
            <form
              onSubmit={handleSearch}
              className="flex items-center rounded-full border-2 border-gray-100 bg-gray-50 p-1 transition-all duration-200 focus-within:border-pink-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(233,30,99,0.08)]"
            >
              <span style={matIcon} className="pl-4 text-[20px] text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Search products, brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className="min-w-0 flex-1 border-none bg-transparent px-3 py-2.5 text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear"
                  className="mr-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300"
                >
                  <span style={matIcon} className="text-[16px]">
                    close
                  </span>
                </button>
              )}
              <button
                type="submit"
                className="flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none px-5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
                style={{
                  background: "linear-gradient(135deg, #e91e63, #9c27b0)",
                }}
              >
                Search
              </button>
            </form>

            {searchFocused && (
              <SearchSuggestions
                query={searchQuery}
                onSelect={handleSuggestionSelect}
                placement="desktop"
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 max-md:gap-1">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-none bg-transparent transition-all duration-200 hover:bg-pink-50 lg:hidden max-md:h-10 max-md:w-10"
            >
              <span style={matIcon} className="text-[24px] text-gray-700">
                search
              </span>
            </button>

            {user ? (
              <>
                <IconButton
                  to="/wishlist"
                  title="Wishlist"
                  icon="favorite_border"
                  count={wishlistCount}
                  label="Wishlist"
                />
                <IconButton
                  to="/cart"
                  title="Cart"
                  icon="shopping_cart"
                  count={cartCount}
                  label="Cart"
                />
                <IconButton
                  to="/notifications"
                  title="Notifications"
                  icon="notifications"
                  count={unreadCount}
                  label="Alerts"
                />

                <div className="relative ml-2">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-full border-2 border-gray-100 bg-white p-1 pr-3 transition-all duration-200 hover:border-pink-200 hover:bg-pink-50 max-md:pr-2"
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg, #e91e63, #9c27b0)",
                      }}
                    >
                      {getUserInitial()}
                    </div>
                    <span className="max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-gray-800 max-lg:hidden">
                      {getFirstName()}
                    </span>
                    <span
                      style={matIcon}
                      className="text-[18px] text-gray-500 max-lg:hidden"
                    >
                      expand_more
                    </span>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-[99]"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div
                        className="absolute right-0 z-[100] mt-2.5 min-w-[280px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
                        style={{ animation: "dropdown-slide 0.2s ease" }}
                      >
                        <div
                          className="flex items-center gap-3.5 px-5 py-5"
                          style={{
                            background:
                              "linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%)",
                          }}
                        >
                          <div
                            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow-md"
                            style={{
                              background:
                                "linear-gradient(135deg, #e91e63, #9c27b0)",
                            }}
                          >
                            {getUserInitial()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 mb-0.5 truncate text-base font-bold text-gray-800">
                              {getUserName()}
                            </p>
                            <p className="m-0 truncate text-xs text-gray-600">
                              {user.email || ""}
                            </p>
                          </div>
                        </div>

                        <div className="py-2">
                          {[
                            {
                              to: "/my-orders",
                              icon: "inventory_2",
                              label: "My Orders",
                            },
                            {
                              to: "/wishlist",
                              icon: "favorite",
                              label: "Wishlist",
                              badge: wishlistCount,
                            },
                            {
                              to: "/notifications",
                              icon: "notifications",
                              label: "Notifications",
                              badge: unreadCount,
                            },
                            {
                              to: "/my-returns",
                              icon: "assignment_return",
                              label: "Returns",
                            },
                          ].map(({ to, icon, label, badge }) => (
                            <Link
                              key={to}
                              to={to}
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 no-underline transition-all duration-200 hover:bg-pink-50 hover:text-pink-600"
                            >
                              <span
                                style={matIcon}
                                className="text-[20px] text-pink-500"
                              >
                                {icon}
                              </span>
                              <span className="flex-1">{label}</span>
                              {badge > 0 && (
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pink-100 px-1.5 text-[11px] font-bold text-pink-700">
                                  {badge}
                                </span>
                              )}
                            </Link>
                          ))}
                          {user.role === "admin" && (
                            <Link
                              to="/admin/dashboard"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 border-t border-gray-100 px-5 py-2.5 text-sm font-semibold text-purple-700 no-underline transition-all duration-200 hover:bg-purple-50"
                            >
                              <span style={matIcon} className="text-[20px]">
                                admin_panel_settings
                              </span>
                              Admin Dashboard
                            </Link>
                          )}
                        </div>

                        <div className="border-t border-gray-100 p-3">
                          <button
                            onClick={handleLogout}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 transition-all duration-200 hover:bg-red-500 hover:text-white"
                          >
                            <span style={matIcon} className="text-[18px]">
                              logout
                            </span>
                            Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <Link
                  to="/login"
                  className="rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-700 no-underline transition-all duration-200 hover:bg-pink-50 hover:text-pink-600"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #e91e63, #9c27b0)",
                  }}
                >
                  Sign Up
                </Link>
              </div>
            )}

            <button
              onClick={toggleMenu}
              aria-label="Menu"
              className="flex h-11 w-11 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-none bg-transparent transition-all duration-200 hover:bg-pink-50 lg:hidden max-md:h-10 max-md:w-10"
            >
              <span
                className={`block h-[2.5px] w-5 rounded bg-gray-800 transition-all duration-300 ${
                  menuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-[2.5px] w-5 rounded bg-gray-800 transition-all duration-300 ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-[2.5px] w-5 rounded bg-gray-800 transition-all duration-300 ${
                  menuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </button>
          </div>

          {searchOpen && (
            <div
              ref={mobileSearchRef}
              className="absolute inset-x-0 top-full z-50 border-b border-gray-100 bg-white p-4 shadow-lg"
              style={{ animation: "slide-down 0.25s ease" }}
            >
              <form
                onSubmit={handleSearch}
                className="relative mx-auto flex max-w-2xl items-center gap-2"
              >
                <div className="flex flex-1 items-center rounded-full bg-gray-100 px-4 focus-within:ring-2 focus-within:ring-pink-500">
                  <span style={matIcon} className="text-[20px] text-gray-400">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    autoFocus
                    className="flex-1 border-none bg-transparent px-3 py-3 text-base outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear"
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-gray-200 text-gray-600"
                    >
                      <span style={matIcon} className="text-[16px]">
                        close
                      </span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                    setSearchFocused(false);
                  }}
                  aria-label="Close"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-none bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                >
                  <span style={matIcon} className="text-[20px]">
                    close
                  </span>
                </button>
              </form>

              {searchFocused && (
                <div className="relative mx-auto max-w-2xl">
                  <SearchSuggestions
                    query={searchQuery}
                    onSelect={handleSuggestionSelect}
                    placement="mobile"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <div
        className={`fixed top-0 z-[1001] flex h-screen w-[340px] max-w-[85%] flex-col overflow-y-auto bg-white shadow-2xl transition-[right] duration-300 ease-in-out max-[480px]:max-w-full ${
          menuOpen ? "right-0" : "-right-full"
        }`}
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div
          className="flex shrink-0 items-center justify-between px-5 py-5"
          style={{
            background: "linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%)",
          }}
        >
          <Logo size="small" />
          <button
            onClick={closeMenu}
            aria-label="Close"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/80 text-gray-700 transition-all duration-200 hover:bg-white"
          >
            <span style={matIcon} className="text-[22px]">
              close
            </span>
          </button>
        </div>

        <ul className="m-0 list-none p-0 py-3">
          {mobileNavLinks.map(([to, icon, label]) => (
            <li key={to}>
              <Link
                to={to}
                onClick={closeMenu}
                className="flex items-center gap-3 px-6 py-3 text-[15px] font-medium text-gray-700 no-underline transition-all duration-200 hover:bg-pink-50 hover:text-pink-600"
              >
                <span
                  style={matIcon}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-[20px] text-pink-600"
                >
                  {icon}
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {user ? (
          <div className="flex-1 border-t border-gray-100 px-5 py-4">
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 p-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-md"
                style={{
                  background: "linear-gradient(135deg, #e91e63, #9c27b0)",
                }}
              >
                {getUserInitial()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 mb-0.5 truncate text-sm font-bold text-gray-800">
                  {getUserName()}
                </p>
                <p className="m-0 truncate text-xs text-gray-600">
                  {user.email || ""}
                </p>
              </div>
            </div>

            <ul className="m-0 list-none p-0">
              {[
                { to: "/my-orders", icon: "inventory_2", label: "My Orders" },
                {
                  to: "/wishlist",
                  icon: "favorite_border",
                  label: "Wishlist",
                  badge: wishlistCount,
                },
                {
                  to: "/cart",
                  icon: "shopping_cart",
                  label: "Cart",
                  badge: cartCount,
                },
                {
                  to: "/notifications",
                  icon: "notifications",
                  label: "Notifications",
                  badge: unreadCount,
                },
                {
                  to: "/my-returns",
                  icon: "assignment_return",
                  label: "Returns",
                },
              ].map(({ to, icon, label, badge }) => (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={closeMenu}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm text-gray-700 no-underline transition-all duration-200 hover:bg-pink-50 hover:text-pink-600"
                  >
                    <span style={matIcon} className="text-[20px] text-pink-500">
                      {icon}
                    </span>
                    <span className="flex-1">{label}</span>
                    {badge > 0 && (
                      <span
                        className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #ef4444, #dc2626)",
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}

              {user.role === "admin" && (
                <li>
                  <Link
                    to="/admin/dashboard"
                    onClick={closeMenu}
                    className="flex w-full items-center gap-3 rounded-lg border-t border-gray-100 px-2 py-3 text-sm font-semibold text-purple-700 no-underline transition-all duration-200 hover:bg-purple-50"
                  >
                    <span
                      style={matIcon}
                      className="text-[20px] text-purple-600"
                    >
                      admin_panel_settings
                    </span>
                    Admin Dashboard
                  </Link>
                </li>
              )}

              <li className="mt-3">
                <button
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-red-50 py-3 text-sm font-semibold text-red-600 transition-all duration-200 hover:bg-red-500 hover:text-white"
                >
                  <span style={matIcon} className="text-[18px]">
                    logout
                  </span>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="mt-auto flex flex-col gap-3 border-t border-gray-100 px-6 py-6">
            <Link
              to="/login"
              onClick={closeMenu}
              className="flex w-full items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 no-underline transition-all duration-200 hover:border-pink-500 hover:text-pink-600"
            >
              Login
            </Link>
            <Link
              to="/register"
              onClick={closeMenu}
              className="flex w-full items-center justify-center rounded-xl border-none px-4 py-3 text-sm font-semibold text-white no-underline transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #e91e63, #9c27b0)",
              }}
            >
              Create Account
            </Link>
          </div>
        )}
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
          style={{ animation: "fade-in 0.3s ease" }}
          onClick={closeMenu}
        />
      )}

      <div className="h-20 max-md:h-[70px] max-[480px]:h-16" />

      <style>{`
        @keyframes dropdown-slide {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
