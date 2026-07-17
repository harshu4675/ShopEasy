import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  useEffect(() => {
    const fontId = "legal-google-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const matIcon = {
    fontFamily: '"Material Symbols Outlined"',
    fontWeight: "normal",
    fontStyle: "normal",
    lineHeight: 1,
    display: "inline-block",
  };

  return (
    <div
      className="min-h-screen bg-[#f8f9ff]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="relative overflow-hidden pb-[120px] pt-[80px] max-md:pb-[100px] max-md:pt-[60px] max-[480px]:pb-[80px] max-[480px]:pt-[50px]"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="container mx-auto px-4">
          <div className="relative z-10 text-center">
            <span
              className="mb-5 block text-[64px] leading-none max-md:text-[48px] max-[480px]:text-[40px]"
              style={{
                ...matIcon,
                fontSize: "inherit",
                animation: "bounce-legal 2s ease-in-out infinite",
              }}
            >
              lock
            </span>
            <h1 className="mb-3 text-[42px] font-extrabold text-white max-md:text-[32px] max-[480px]:text-[26px]">
              Privacy Policy
            </h1>
            <p className="mb-4 text-[18px] text-white/90 max-md:text-[16px] max-[480px]:text-[14px]">
              Your privacy is important to us
            </p>
            <span className="inline-block rounded-[20px] bg-white/20 px-5 py-2 text-[13px] font-medium text-white max-[480px]:px-[14px] max-[480px]:py-[6px] max-[480px]:text-[11px]">
              Last Updated: January 2025
            </span>
          </div>
        </div>
        <div className="absolute bottom-[-1px] left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="block h-[80px] w-full"
          >
            <path
              d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
              fill="#f8f9ff"
            />
          </svg>
        </div>
        <style>{`
          @keyframes bounce-legal {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>

      <div className="py-[60px] max-md:py-[40px] max-[480px]:py-[30px]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-[280px_1fr] items-start gap-10 max-[1024px]:grid-cols-1">
            <div className="rounded-[16px] border border-[rgba(102,126,234,0.08)] bg-white p-6 shadow-[0_4px_20px_rgba(102,126,234,0.1)] max-[1024px]:static max-[1024px]:flex max-[1024px]:flex-col max-[480px]:p-4 lg:sticky lg:top-[100px]">
              <h3 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[16px] font-bold text-[#1a1a2e]">
                Table of Contents
              </h3>
              <ul className="m-0 list-none p-0 max-[1024px]:flex max-[1024px]:flex-wrap max-[1024px]:gap-2">
                {[
                  ["#introduction", "Introduction"],
                  ["#information-we-collect", "Information We Collect"],
                  ["#how-we-use", "How We Use Your Information"],
                  ["#cookies", "Cookies & Tracking"],
                  ["#data-security", "Data Security"],
                  ["#your-rights", "Your Rights"],
                  ["#contact", "Contact Us"],
                ].map(([href, label]) => (
                  <li key={href} className="mb-2 max-[1024px]:mb-0">
                    <a
                      href={href}
                      className="block rounded-[8px] px-[14px] py-[10px] text-[14px] font-medium text-[#6b7280] no-underline transition-all duration-300 hover:bg-[linear-gradient(135deg,rgba(102,126,234,0.1)_0%,rgba(118,75,162,0.1)_100%)] hover:pl-5 hover:text-[#667eea] max-[1024px]:whitespace-nowrap max-[1024px]:rounded-[20px] max-[1024px]:bg-[rgba(102,126,234,0.06)] max-[1024px]:px-[14px] max-[1024px]:py-2 max-[1024px]:text-[12px] max-[1024px]:hover:pl-[14px] max-[480px]:text-[12px] max-[480px]:px-3 max-[480px]:py-[6px]"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-8">
              <section
                id="introduction"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 text-[40px] leading-none max-md:text-[32px] max-[480px]:text-[28px]">
                  <span
                    style={matIcon}
                    className="text-[40px] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    waving_hand
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Introduction
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  Welcome to <strong>ShopEasy</strong>! We are committed to
                  protecting your personal information and your right to
                  privacy. This Privacy Policy explains how we collect, use, and
                  safeguard your information when you visit our website and make
                  purchases.
                </p>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  By using our services, you agree to the collection and use of
                  information in accordance with this policy. If you have any
                  questions, please contact us at{" "}
                  <a
                    href="mailto:harshu6278@gmail.com"
                    className="font-semibold text-[#667eea] no-underline hover:underline"
                  >
                    harshu6278@gmail.com
                  </a>
                  .
                </p>
              </section>

              <section
                id="information-we-collect"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 text-[40px] leading-none max-md:text-[32px] max-[480px]:text-[28px]">
                  <span style={matIcon} className="text-[40px]">
                    edit_note
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Information We Collect
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  We collect the following types of information:
                </p>
                {[
                  {
                    title: "Personal Information",
                    items: [
                      ["Name", "To personalize your experience and orders"],
                      ["Email Address", "For order confirmations and updates"],
                      [
                        "Phone Number",
                        "For delivery coordination and OTP verification",
                      ],
                      ["Shipping Address", "To deliver your orders"],
                    ],
                  },
                  {
                    title: "Payment Information",
                    items: [
                      [
                        null,
                        "Payment method details (processed securely by payment gateways)",
                      ],
                      [null, "Transaction history for your records"],
                      [
                        null,
                        "We do NOT store your complete card details on our servers",
                      ],
                    ],
                  },
                  {
                    title: "Device Information",
                    items: [
                      [null, "Browser type and version"],
                      [null, "Device type (mobile, desktop, tablet)"],
                      [null, "IP address for security purposes"],
                    ],
                  },
                ].map(({ title, items }) => (
                  <div
                    key={title}
                    className="mb-4 rounded-[12px] border-l-4 border-[#667eea] bg-[linear-gradient(135deg,rgba(102,126,234,0.04)_0%,rgba(118,75,162,0.04)_100%)] p-5"
                  >
                    <h4 className="mb-3 text-[16px] font-bold text-[#1a1a2e]">
                      {title}
                    </h4>
                    <ul className="m-0 list-none p-0">
                      {items.map(([label, desc], i) => (
                        <li
                          key={i}
                          className="relative py-2 pl-5 text-[14px] text-[#4b5563] before:absolute before:left-0 before:font-bold before:text-[#667eea] before:content-['•']"
                        >
                          {label ? (
                            <>
                              <strong>{label}:</strong> {desc}
                            </>
                          ) : (
                            desc
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>

              <section
                id="how-we-use"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    settings
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  How We Use Your Information
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  We use your information for the following purposes:
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 max-[1024px]:grid-cols-1">
                  {[
                    {
                      icon: "shopping_cart",
                      title: "Order Processing",
                      desc: "To process and fulfill your orders, including shipping and delivery",
                    },
                    {
                      icon: "mail",
                      title: "Communication",
                      desc: "To send order updates, promotional offers, and important notifications",
                    },
                    {
                      icon: "lock",
                      title: "Account Security",
                      desc: "To verify your identity and protect your account from unauthorized access",
                    },
                    {
                      icon: "bar_chart",
                      title: "Improvement",
                      desc: "To improve our website, products, and customer service",
                    },
                  ].map(({ icon, title, desc }) => (
                    <div
                      key={title}
                      className="rounded-[12px] border border-[rgba(102,126,234,0.1)] bg-white p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#667eea] hover:shadow-[0_8px_20px_rgba(102,126,234,0.15)] max-[480px]:p-[14px]"
                    >
                      <span
                        style={matIcon}
                        className="mb-3 block text-[32px] text-[#667eea]"
                      >
                        {icon}
                      </span>
                      <h4 className="mb-[6px] text-[15px] font-bold text-[#1a1a2e]">
                        {title}
                      </h4>
                      <p className="m-0 text-[13px] text-[#6b7280]">{desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section
                id="cookies"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    cookie
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Cookies & Tracking Technologies
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  Yes, we use cookies and similar tracking technologies to
                  enhance your browsing experience. Cookies are small files
                  stored on your device that help us:
                </p>
                <div className="my-5 flex flex-col gap-3">
                  {[
                    {
                      title: "Essential Cookies",
                      desc: "Required for the website to function properly (login, cart, checkout)",
                      badge: "Required",
                      required: true,
                    },
                    {
                      title: "Preference Cookies",
                      desc: "Remember your preferences and settings",
                      badge: "Optional",
                      required: false,
                    },
                    {
                      title: "Analytics Cookies",
                      desc: "Help us understand how visitors use our website",
                      badge: "Optional",
                      required: false,
                    },
                  ].map(({ title, desc, badge, required }) => (
                    <div
                      key={title}
                      className="flex items-center justify-between rounded-[10px] bg-[rgba(102,126,234,0.04)] px-5 py-4"
                    >
                      <div>
                        <h4 className="mb-1 text-[14px] font-bold text-[#1a1a2e]">
                          {title}
                        </h4>
                        <p className="m-0 text-[13px] text-[#6b7280]">{desc}</p>
                      </div>
                      <span
                        className={`rounded-[20px] px-3 py-1 text-[11px] font-bold ${
                          required
                            ? "bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] text-white"
                            : "bg-[rgba(102,126,234,0.1)] text-[#667eea]"
                        }`}
                      >
                        {badge}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-start gap-[14px] rounded-[12px] bg-[linear-gradient(135deg,rgba(102,126,234,0.08)_0%,rgba(118,75,162,0.08)_100%)] px-5 py-[18px]">
                  <span
                    style={matIcon}
                    className="shrink-0 text-[24px] text-[#667eea]"
                  >
                    lightbulb
                  </span>
                  <p className="m-0 text-[14px] text-[#4b5563]">
                    You can manage cookie preferences in your browser settings.
                    However, disabling essential cookies may affect website
                    functionality.
                  </p>
                </div>
              </section>

              <section
                id="data-security"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    shield
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Data Security
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  We take your data security seriously and implement various
                  measures to protect your information:
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 max-[1024px]:grid-cols-1">
                  {[
                    {
                      icon: "lock",
                      title: "SSL Encryption",
                      desc: "All data transmitted is encrypted using SSL technology",
                    },
                    {
                      icon: "dns",
                      title: "Secure Servers",
                      desc: "Your data is stored on secure, protected servers",
                    },
                    {
                      icon: "group",
                      title: "Limited Access",
                      desc: "Only authorized personnel can access your information",
                    },
                    {
                      icon: "block",
                      title: "No Third-Party Sharing",
                      desc: "We do NOT share your data with third parties",
                    },
                  ].map(({ icon, title, desc }) => (
                    <div
                      key={title}
                      className="flex items-start gap-[14px] rounded-[12px] border border-[rgba(102,126,234,0.1)] bg-white p-[18px] max-[480px]:p-[14px]"
                    >
                      <span
                        style={matIcon}
                        className="text-[28px] text-[#667eea]"
                      >
                        {icon}
                      </span>
                      <div>
                        <h4 className="mb-1 text-[14px] font-bold text-[#1a1a2e]">
                          {title}
                        </h4>
                        <p className="m-0 text-[13px] text-[#6b7280]">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section
                id="your-rights"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    check_circle
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Your Rights
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  You have the following rights regarding your personal data:
                </p>
                <div className="my-5 flex flex-col gap-[14px]">
                  {[
                    {
                      icon: "visibility",
                      title: "Right to Access",
                      desc: "Request a copy of your personal data we hold",
                    },
                    {
                      icon: "edit",
                      title: "Right to Correction",
                      desc: "Request correction of inaccurate personal data",
                    },
                    {
                      icon: "delete",
                      title: "Right to Deletion",
                      desc: "Request deletion of your personal data",
                    },
                    {
                      icon: "upload",
                      title: "Right to Data Portability",
                      desc: "Request your data in a portable format",
                    },
                  ].map(({ icon, title, desc }) => (
                    <div
                      key={title}
                      className="flex items-start gap-4 rounded-[12px] bg-[rgba(102,126,234,0.04)] p-[18px] transition-all duration-300 hover:translate-x-2 hover:bg-[rgba(102,126,234,0.08)] max-[480px]:p-[14px]"
                    >
                      <span
                        style={matIcon}
                        className="text-[24px] text-[#667eea]"
                      >
                        {icon}
                      </span>
                      <div>
                        <h4 className="mb-1 text-[15px] font-bold text-[#1a1a2e]">
                          {title}
                        </h4>
                        <p className="m-0 text-[13px] text-[#6b7280]">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 rounded-[10px] border-l-4 border-[#10b981] bg-[rgba(16,185,129,0.1)] p-[14px] text-[14px] text-[#4b5563]">
                  To exercise any of these rights, please contact us at{" "}
                  <a
                    href="mailto:harshu6278@gmail.com"
                    className="font-semibold text-[#667eea] no-underline hover:underline"
                  >
                    harshu6278@gmail.com
                  </a>
                  .
                </p>
              </section>

              <section
                id="contact"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    phone
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Contact Us
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  If you have any questions about this Privacy Policy or our
                  data practices, please contact us:
                </p>
                <div
                  className="mt-5 flex flex-wrap items-center justify-between gap-6 rounded-[16px] p-7 max-md:flex-col max-md:text-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  <div className="flex flex-col gap-4 max-md:items-center">
                    {[
                      {
                        icon: "business",
                        label: "ShopEasy",
                        value: "Dhar Road, Indore, MP, India",
                        href: null,
                      },
                      {
                        icon: "mail",
                        label: "Email",
                        value: "harshu6278@gmail.com",
                        href: "mailto:harshu6278@gmail.com",
                      },
                      {
                        icon: "phone",
                        label: "Phone",
                        value: "+91 78989 69930",
                        href: "tel:+917898969930",
                      },
                    ].map(({ icon, label, value, href }) => (
                      <div
                        key={label}
                        className="flex items-start gap-3 text-white"
                      >
                        <span style={matIcon} className="text-[24px]">
                          {icon}
                        </span>
                        <div>
                          <strong className="mb-[2px] block text-[13px] opacity-90">
                            {label}
                          </strong>
                          <p className="m-0 text-[15px] text-white">
                            {href ? (
                              <a
                                href={href}
                                className="text-white no-underline hover:underline"
                              >
                                {value}
                              </a>
                            ) : (
                              value
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/contact"
                    className="whitespace-nowrap rounded-[10px] bg-white px-7 py-[14px] text-[15px] font-bold text-[#667eea] no-underline transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] max-md:w-full max-md:text-center"
                  >
                    Contact Us
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
