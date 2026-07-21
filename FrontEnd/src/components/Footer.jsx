import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const Footer = () => {
  useEffect(() => {
    const fontId = "footer-google-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const shopLinks = [
    { to: "/products?category=Men's Clothing", label: "Men's Fashion" },
    { to: "/products?category=Women's Clothing", label: "Women's Fashion" },
    { to: "/products?category=Kids' Clothing", label: "Kids' Wear" },
    { to: "/products?category=Perfumes", label: "Perfumes" },
    { to: "/products?category=Accessories", label: "Accessories" },
  ];

  const helpLinks = [
    { href: "/contact", label: "FAQ" },
    { href: "#track", label: "Track Order" },
    { href: "#contact", label: "Contact Us" },
  ];

  const paymentMethods = [
    { icon: "credit_card", label: "Visa" },
    { icon: "credit_card", label: "Mastercard" },
    { icon: "smartphone", label: "UPI" },
    { icon: "account_balance", label: "Net Banking" },
  ];

  const sections = [
    { title: "Shop", links: shopLinks, isRouter: true },
    { title: "Help", links: helpLinks, isRouter: false },
  ];

  const bottomLinks = [
    { to: "/privacy", label: "Privacy Policy" },
    { to: "/terms", label: "Terms of Service" },
    { to: "/contact", label: "Contact Us" },
  ];

  return (
    <footer
      className="relative overflow-hidden text-white"
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        className="absolute inset-0 z-0 opacity-50"
        style={{
          background:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23667eea' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 pb-10 pt-[60px] max-[900px]:pb-[30px] max-[900px]:pt-[50px] max-md:pb-[30px] max-md:pt-10 max-[480px]:pb-[25px] max-[480px]:pt-[35px] max-[380px]:pb-5 max-[380px]:pt-[30px]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[2fr_1fr_1fr] gap-[50px] px-5 max-[1024px]:grid-cols-[1.5fr_1fr_1fr] max-[1024px]:gap-10 max-[900px]:grid-cols-2 max-[900px]:gap-10 max-md:grid-cols-1 max-md:gap-[35px] max-[480px]:gap-[30px] max-[480px]:px-4 max-[380px]:gap-[30px] max-[380px]:px-[14px]">
          <div className="max-w-[400px] max-[900px]:col-span-2 max-[900px]:max-w-full max-[900px]:text-center max-md:col-span-1 max-md:text-center">
            <Logo size="default" />
            <p className="mb-6 mt-5 text-[14px] leading-[1.7] text-white/70 max-[900px]:mx-auto max-[900px]:max-w-[500px] max-[480px]:mt-4 max-[480px]:text-[13px] max-[380px]:text-[12px]">
              Your one-stop destination for fashion, accessories, and lifestyle
              products. Shop the latest trends at unbeatable prices!
            </p>
            <div className="flex gap-3 max-[900px]:justify-center max-[480px]:gap-[10px]">
              {[
                {
                  href: "https://www.facebook.com/talishfinds",
                  icon: <FaFacebookF />,
                  label: "Facebook",
                },
                {
                  href: "https://www.instagram.com/talishfinds",
                  icon: <FaInstagram />,
                  label: "Instagram",
                },
              ].map(({ href, icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/10 bg-white/10 no-underline backdrop-blur-[10px] transition-all duration-300 hover:-translate-y-[3px] hover:border-transparent hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)] max-[480px]:h-[38px] max-[480px]:w-[38px] max-[480px]:rounded-[10px] max-[380px]:h-9 max-[380px]:w-9"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  }}
                >
                  <span
                    style={matIcon}
                    className="text-[20px] text-white max-[480px]:text-[16px]"
                  >
                    {icon}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {sections.map(({ title, links, isRouter }) => (
            <div key={title} className="max-md:text-center">
              <h4 className="relative mb-5 pb-3 text-[18px] font-bold text-white max-[480px]:mb-[14px] max-[480px]:pb-2 max-[480px]:text-[15px] max-[380px]:text-[14px]">
                <span className="relative">
                  {title}
                  <span
                    className="absolute bottom-0 left-0 h-[3px] w-10 translate-y-3 rounded-[2px] max-md:left-1/2 max-md:-translate-x-1/2 max-md:translate-y-3 max-[480px]:h-[2px] max-[480px]:w-[30px]"
                    style={{
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                  />
                </span>
              </h4>
              <ul className="m-0 list-none p-0">
                {links.map(({ label, ...rest }) => (
                  <li
                    key={label}
                    className="mb-3 max-[480px]:mb-2 max-[380px]:mb-2"
                  >
                    {isRouter ? (
                      <Link
                        to={rest.to}
                        className="group relative inline-block pl-0 text-[14px] text-white/70 no-underline transition-all duration-300 hover:pl-5 hover:text-white max-md:pl-0 max-md:hover:pl-0 max-[480px]:text-[12px] max-[380px]:text-[11px]"
                      >
                        <span className="absolute left-[-20px] text-[#667eea] opacity-0 transition-all duration-300 group-hover:left-0 group-hover:opacity-100 max-md:hidden">
                          &rarr;
                        </span>
                        {label}
                      </Link>
                    ) : (
                      <a
                        href={rest.href}
                        className="group relative inline-block pl-0 text-[14px] text-white/70 no-underline transition-all duration-300 hover:pl-5 hover:text-white max-md:pl-0 max-md:hover:pl-0 max-[480px]:text-[12px] max-[380px]:text-[11px]"
                      >
                        <span className="absolute left-[-20px] text-[#667eea] opacity-0 transition-all duration-300 group-hover:left-0 group-hover:opacity-100 max-md:hidden">
                          &rarr;
                        </span>
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 py-7 max-md:py-6 max-[480px]:py-5 max-[380px]:py-5">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-5 px-5 max-[900px]:flex-col max-[900px]:gap-4 max-[900px]:text-center max-[480px]:gap-[14px] max-[480px]:px-4 max-[380px]:gap-[14px] max-[380px]:px-[14px]">
          <p className="m-0 text-[14px] text-white/60 max-md:text-[13px] max-[480px]:text-[12px] max-[380px]:text-[11px]">
            &copy; {new Date().getFullYear()} TalishClothes. All rights
            reserved.
          </p>

          <div className="flex flex-wrap justify-center gap-6 max-md:flex-col max-md:gap-3 max-[480px]:gap-[10px]">
            {bottomLinks.map(({ to, label }) => (
              <Link
                key={label}
                to={to}
                className="relative text-[14px] font-medium text-white/70 no-underline transition-all duration-300 after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:rounded-sm after:bg-[#667eea] after:transition-all after:duration-300 after:content-[''] hover:text-white hover:after:w-full max-[480px]:text-[12px] max-[380px]:text-[11px]"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4 max-[480px]:gap-[8px] max-[380px]:gap-[6px]">
            {paymentMethods.map(({ icon, label }) => (
              <span
                key={label}
                className="inline-flex cursor-default items-center gap-[6px] rounded-[8px] border border-white/10 bg-white/[0.08] px-[14px] py-2 text-[12px] font-semibold text-white/80 backdrop-blur-[10px] transition-all duration-300 hover:-translate-y-[2px] hover:bg-white/[0.15] max-[480px]:rounded-[6px] max-[480px]:px-3 max-[480px]:py-[5px] max-[480px]:text-[10px] max-[380px]:px-2 max-[380px]:py-1 max-[380px]:text-[9px]"
              >
                <span style={matIcon} className="text-[14px]">
                  {icon}
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; }
        }
        @media print {
          footer { background: white !important; color: black !important; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
