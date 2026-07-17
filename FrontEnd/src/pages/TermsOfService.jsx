import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
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
              style={{
                ...matIcon,
                animation: "bounce-legal 2s ease-in-out infinite",
              }}
              className="mb-5 block text-[64px] leading-none max-md:text-[48px] max-[480px]:text-[40px]"
            >
              description
            </span>
            <h1 className="mb-3 text-[42px] font-extrabold text-white max-md:text-[32px] max-[480px]:text-[26px]">
              Terms of Service
            </h1>
            <p className="mb-4 text-[18px] text-white/90 max-md:text-[16px] max-[480px]:text-[14px]">
              Please read these terms carefully before using our services
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
                  ["#acceptance", "Acceptance of Terms"],
                  ["#account", "Account Registration"],
                  ["#orders", "Orders & Payments"],
                  ["#shipping", "Shipping Policy"],
                  ["#returns", "Returns & Refunds"],
                  ["#cancellation", "Order Cancellation"],
                  ["#prohibited", "Prohibited Activities"],
                  ["#contact", "Contact Us"],
                ].map(([href, label]) => (
                  <li key={href} className="mb-2 max-[1024px]:mb-0">
                    <a
                      href={href}
                      className="block rounded-[8px] px-[14px] py-[10px] text-[14px] font-medium text-[#6b7280] no-underline transition-all duration-300 hover:bg-[linear-gradient(135deg,rgba(102,126,234,0.1)_0%,rgba(118,75,162,0.1)_100%)] hover:pl-5 hover:text-[#667eea] max-[1024px]:whitespace-nowrap max-[1024px]:rounded-[20px] max-[1024px]:bg-[rgba(102,126,234,0.06)] max-[1024px]:px-[14px] max-[1024px]:py-2 max-[1024px]:hover:pl-[14px] max-[480px]:text-[12px] max-[480px]:px-3 max-[480px]:py-[6px]"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-8">
              <section
                id="acceptance"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] text-[#667eea] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    check_circle
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Acceptance of Terms
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  Welcome to <strong>ShopEasy</strong>! By accessing or using
                  our website and services, you agree to be bound by these Terms
                  of Service. If you do not agree to these terms, please do not
                  use our services.
                </p>
                <div className="flex items-start gap-[14px] rounded-[12px] border-l-4 border-[#667eea] bg-[linear-gradient(135deg,rgba(102,126,234,0.1)_0%,rgba(118,75,162,0.1)_100%)] px-5 py-[18px]">
                  <span
                    style={matIcon}
                    className="shrink-0 text-[24px] text-[#f59e0b]"
                  >
                    warning
                  </span>
                  <p className="m-0 text-[14px] text-[#4b5563]">
                    These terms constitute a legally binding agreement between
                    you and ShopEasy. Please read them carefully before making
                    any purchase.
                  </p>
                </div>
              </section>

              <section
                id="account"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] text-[#667eea] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    person
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Account Registration
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  To make purchases on ShopEasy, you may need to create an
                  account. You agree to:
                </p>
                <div className="mt-5 flex flex-col gap-[14px]">
                  {[
                    {
                      n: "1",
                      title: "Accurate Information",
                      desc: "Provide accurate, current, and complete information during registration",
                    },
                    {
                      n: "2",
                      title: "Account Security",
                      desc: "Keep your password confidential and secure",
                    },
                    {
                      n: "3",
                      title: "Account Responsibility",
                      desc: "You are responsible for all activities under your account",
                    },
                    {
                      n: "4",
                      title: "One Account Per Person",
                      desc: "Do not create multiple accounts for fraudulent purposes",
                    },
                  ].map(({ n, title, desc }) => (
                    <div
                      key={n}
                      className="flex items-start gap-4 rounded-[12px] border border-[rgba(102,126,234,0.1)] bg-white p-[18px] max-[480px]:p-[14px]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] text-[14px] font-bold text-white">
                        {n}
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
              </section>

              <section
                id="orders"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] text-[#667eea] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    shopping_cart
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Orders & Payments
                </h2>
                <div className="my-6">
                  <h3 className="mb-[14px] text-[17px] font-bold text-[#1a1a2e]">
                    Accepted Payment Methods
                  </h3>
                  <div className="grid grid-cols-4 gap-3 max-[1024px]:grid-cols-2 max-[480px]:grid-cols-2 max-[480px]:gap-[10px]">
                    {[
                      { icon: "credit_card", label: "Credit/Debit Cards" },
                      { icon: "smartphone", label: "UPI Payments" },
                      { icon: "payments", label: "Cash on Delivery (COD)" },
                      {
                        icon: "account_balance_wallet",
                        label: "Digital Wallets",
                      },
                    ].map(({ icon, label }) => (
                      <div
                        key={label}
                        className="rounded-[12px] border border-[rgba(102,126,234,0.1)] bg-white p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#667eea] hover:shadow-[0_6px_16px_rgba(102,126,234,0.15)] max-[480px]:p-[14px_10px]"
                      >
                        <span
                          style={matIcon}
                          className="mb-[10px] block text-[32px] text-[#667eea] max-[480px]:text-[26px]"
                        >
                          {icon}
                        </span>
                        <p className="m-0 text-[12px] font-semibold text-[#4b5563]">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="my-6">
                  <h3 className="mb-[14px] text-[17px] font-bold text-[#1a1a2e]">
                    Order Terms
                  </h3>
                  <ul className="m-0 my-4 list-none p-0">
                    {[
                      "All prices are displayed in Indian Rupees",
                      "Prices are subject to change without prior notice",
                      "We reserve the right to refuse or cancel any order",
                      "Order confirmation email will be sent after successful payment",
                      "Product availability is subject to stock",
                    ].map((item) => (
                      <li
                        key={item}
                        className="relative border-b border-[rgba(102,126,234,0.06)] py-[10px] pl-7 text-[14px] text-[#4b5563] last:border-b-0 before:absolute before:left-0 before:font-bold before:text-[#10b981] before:content-['✓']"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section
                id="shipping"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] text-[#667eea] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    local_shipping
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Shipping Policy
                </h2>
                <div className="my-5 grid grid-cols-3 gap-4 max-[480px]:grid-cols-1">
                  {[
                    {
                      icon: "celebration",
                      label: "Free Shipping",
                      value: "On orders above Rs.199",
                      desc: "Enjoy free delivery on all orders above Rs.199",
                      highlight: true,
                    },
                    {
                      icon: "inventory_2",
                      label: "Delivery Time",
                      value: "7-8 Business Days",
                      desc: "Expected delivery within 7 to 8 business days",
                      highlight: false,
                    },
                    {
                      icon: "location_on",
                      label: "Delivery Area",
                      value: "All Over India",
                      desc: "We deliver to all serviceable pin codes in India",
                      highlight: false,
                    },
                  ].map(({ icon, label, value, desc, highlight }) => (
                    <div
                      key={label}
                      className={`rounded-[14px] border p-6 text-center transition-all duration-300 hover:-translate-y-1 max-[480px]:p-5 ${
                        highlight
                          ? "border-transparent bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]"
                          : "border-[rgba(102,126,234,0.1)] bg-white hover:shadow-[0_8px_20px_rgba(102,126,234,0.12)]"
                      }`}
                    >
                      <span
                        style={matIcon}
                        className={`mb-3 block text-[36px] ${highlight ? "text-white" : "text-[#667eea]"}`}
                      >
                        {icon}
                      </span>
                      <h4
                        className={`mb-2 text-[14px] font-semibold ${highlight ? "text-white" : "text-[#6b7280]"}`}
                      >
                        {label}
                      </h4>
                      <p
                        className={`mb-[6px] text-[18px] font-extrabold ${highlight ? "text-white" : "text-[#1a1a2e]"}`}
                      >
                        {value}
                      </p>
                      <p
                        className={`m-0 text-[12px] ${highlight ? "text-white" : "text-[#9ca3af]"}`}
                      >
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-start gap-[14px] rounded-[12px] bg-[linear-gradient(135deg,rgba(102,126,234,0.08)_0%,rgba(118,75,162,0.08)_100%)] px-5 py-[18px]">
                  <span
                    style={matIcon}
                    className="shrink-0 text-[24px] text-[#667eea]"
                  >
                    info
                  </span>
                  <p className="m-0 text-[14px] text-[#4b5563]">
                    Delivery times may vary based on your location and product
                    availability. You will receive tracking information via
                    email and SMS once your order is shipped.
                  </p>
                </div>
              </section>

              <section
                id="returns"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] text-[#667eea] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    assignment_return
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Returns & Refunds
                </h2>
                <div className="mt-4 rounded-[16px] bg-[linear-gradient(135deg,rgba(102,126,234,0.04)_0%,rgba(118,75,162,0.04)_100%)] p-7">
                  <div className="mb-6 flex items-center gap-5 border-b-2 border-[rgba(102,126,234,0.1)] pb-5 max-[480px]:flex-col max-[480px]:text-center">
                    <span className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] text-[32px] font-extrabold text-white shadow-[0_6px_20px_rgba(102,126,234,0.3)] max-[480px]:h-[60px] max-[480px]:w-[60px] max-[480px]:text-[26px]">
                      7
                    </span>
                    <div>
                      <h3 className="m-0 mb-1 text-[22px] font-extrabold text-[#1a1a2e]">
                        Days Return Policy
                      </h3>
                      <p className="m-0 text-[14px] text-[#6b7280]">
                        Easy returns within 7 days of delivery
                      </p>
                    </div>
                  </div>
                  <div className="mb-6">
                    <h4 className="mb-3 text-[15px] font-bold text-[#1a1a2e]">
                      Conditions for Return
                    </h4>
                    <ul className="m-0 my-4 list-none p-0">
                      {[
                        "Product must be unused and in original condition",
                        "Original tags and packaging must be intact",
                        "Return request must be raised within 7 days of delivery",
                        "Product must not be damaged by the customer",
                      ].map((item) => (
                        <li
                          key={item}
                          className="relative border-b border-[rgba(102,126,234,0.06)] py-[10px] pl-7 text-[14px] text-[#4b5563] last:border-b-0 before:absolute before:left-0 before:font-bold before:text-[#10b981] before:content-['✓']"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-6">
                    <h4 className="mb-3 text-[15px] font-bold text-[#1a1a2e]">
                      Non-Returnable Items
                    </h4>
                    <ul className="m-0 my-4 list-none p-0">
                      {[
                        "Innerwear and lingerie (due to hygiene reasons)",
                        "Customized or personalized products",
                        "Products marked as Final Sale",
                        "Products with broken seals (perfumes, cosmetics)",
                      ].map((item) => (
                        <li
                          key={item}
                          className="relative border-b border-[rgba(102,126,234,0.06)] py-[10px] pl-7 text-[14px] text-[#4b5563] last:border-b-0 before:absolute before:left-0 before:font-bold before:text-[#ef4444] before:content-['✗']"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[12px] bg-white p-5">
                    <h4 className="mb-4 text-[15px] font-bold text-[#1a1a2e]">
                      Refund Process
                    </h4>
                    <div className="flex flex-wrap items-center justify-between gap-[10px] max-md:flex-col max-md:gap-4">
                      {[
                        "Raise return request",
                        "Product pickup",
                        "Quality check",
                        "Refund in 5-7 days",
                      ].map((step, i, arr) => (
                        <React.Fragment key={step}>
                          <div className="flex-1 min-w-[80px] text-center">
                            <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] text-[14px] font-bold text-white">
                              {i + 1}
                            </span>
                            <p className="m-0 text-[12px] text-[#4b5563]">
                              {step}
                            </p>
                          </div>
                          {i < arr.length - 1 && (
                            <span className="text-[20px] font-bold text-[#667eea] max-md:rotate-90">
                              &rarr;
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-[14px] rounded-[12px] border-l-4 border-[#f59e0b] bg-[linear-gradient(135deg,rgba(245,158,11,0.1)_0%,rgba(217,119,6,0.1)_100%)] px-5 py-[18px]">
                  <span
                    style={matIcon}
                    className="shrink-0 text-[24px] text-[#f59e0b]"
                  >
                    campaign
                  </span>
                  <p className="m-0 text-[14px] text-[#4b5563]">
                    <strong>No Warranty:</strong> We do not provide warranty on
                    products. However, you can replace or return products within
                    the 7-day return window.
                  </p>
                </div>
              </section>

              <section
                id="cancellation"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] text-[#ef4444] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    cancel
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Order Cancellation
                </h2>
                <div className="my-5 grid grid-cols-2 gap-4 max-[1024px]:grid-cols-1">
                  <div className="flex items-start gap-4 rounded-[14px] border border-[rgba(16,185,129,0.2)] bg-[linear-gradient(135deg,rgba(16,185,129,0.1)_0%,rgba(5,150,105,0.1)_100%)] p-6">
                    <span
                      style={matIcon}
                      className="text-[32px] text-[#10b981]"
                    >
                      check_circle
                    </span>
                    <div>
                      <h4 className="mb-1 text-[15px] font-bold text-[#1a1a2e]">
                        Cancellation Allowed
                      </h4>
                      <p className="mb-1 text-[13px] text-[#4b5563]">
                        <strong>Before Shipping Only</strong>
                      </p>
                      <p className="m-0 text-[13px] text-[#4b5563]">
                        You can cancel your order anytime before it has been
                        shipped.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-[14px] border border-[rgba(239,68,68,0.2)] bg-[linear-gradient(135deg,rgba(239,68,68,0.1)_0%,rgba(220,38,38,0.1)_100%)] p-6">
                    <span
                      style={matIcon}
                      className="text-[32px] text-[#ef4444]"
                    >
                      cancel
                    </span>
                    <div>
                      <h4 className="mb-1 text-[15px] font-bold text-[#1a1a2e]">
                        Cancellation Not Allowed
                      </h4>
                      <p className="mb-1 text-[13px] text-[#4b5563]">
                        <strong>After Shipping</strong>
                      </p>
                      <p className="m-0 text-[13px] text-[#4b5563]">
                        Once the order is shipped, cancellation is not possible.
                        You can return it after delivery.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 rounded-[12px] bg-white p-5 shadow-[0_2px_8px_rgba(102,126,234,0.08)]">
                  <h4 className="mb-3 text-[15px] font-bold text-[#1a1a2e]">
                    How to Cancel an Order?
                  </h4>
                  <ol
                    className="m-0 my-4 list-none p-0"
                    style={{ counterReset: "item" }}
                  >
                    {[
                      'Go to "My Orders" in your account',
                      "Find the order you want to cancel",
                      'Click on "Cancel Order" button',
                      "Select the reason for cancellation",
                      "Refund will be processed within 5-7 business days",
                    ].map((item) => (
                      <li
                        key={item}
                        className="relative border-b border-[rgba(102,126,234,0.06)] py-[10px] pl-7 text-[14px] text-[#4b5563] last:border-b-0"
                        style={{ counterIncrement: "item" }}
                      >
                        <span
                          className="absolute left-0 font-bold text-[#667eea]"
                          aria-hidden
                        >
                          {
                            ["1.", "2.", "3.", "4.", "5."][
                              [
                                'Go to "My Orders" in your account',
                                "Find the order you want to cancel",
                                'Click on "Cancel Order" button',
                                "Select the reason for cancellation",
                                "Refund will be processed within 5-7 business days",
                              ].indexOf(item)
                            ]
                          }
                        </span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              <section
                id="prohibited"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] text-[#ef4444] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    block
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Prohibited Activities
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  You agree NOT to:
                </p>
                <div className="my-5 grid grid-cols-3 gap-[14px] max-[1024px]:grid-cols-2 max-[480px]:grid-cols-1 max-[480px]:gap-[10px]">
                  {[
                    {
                      icon: "smart_toy",
                      label: "Use bots or automated systems",
                    },
                    {
                      icon: "theater_comedy",
                      label: "Create fake accounts or impersonate others",
                    },
                    {
                      icon: "bug_report",
                      label: "Attempt to hack or disrupt our services",
                    },
                    {
                      icon: "mark_email_unread",
                      label: "Send spam or unsolicited messages",
                    },
                    {
                      icon: "credit_card_off",
                      label: "Use stolen payment methods",
                    },
                    {
                      icon: "rate_review",
                      label: "Post fake reviews or ratings",
                    },
                  ].map(({ icon, label }) => (
                    <div
                      key={label}
                      className="rounded-[12px] border border-[rgba(239,68,68,0.1)] bg-[rgba(239,68,68,0.05)] p-5 text-center max-[480px]:p-4"
                    >
                      <span
                        style={matIcon}
                        className="mb-[10px] block text-[28px] text-[#ef4444]"
                      >
                        {icon}
                      </span>
                      <p className="m-0 text-[12px] font-medium text-[#4b5563]">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-[14px] rounded-[12px] border-l-4 border-[#ef4444] bg-[linear-gradient(135deg,rgba(239,68,68,0.1)_0%,rgba(220,38,38,0.1)_100%)] px-5 py-[18px]">
                  <span
                    style={matIcon}
                    className="shrink-0 text-[24px] text-[#ef4444]"
                  >
                    warning
                  </span>
                  <p className="m-0 text-[14px] text-[#4b5563]">
                    Violation of these terms may result in immediate account
                    termination and legal action if necessary.
                  </p>
                </div>
              </section>

              <section
                id="contact"
                className="scroll-mt-[100px] rounded-[16px] border border-[rgba(102,126,234,0.06)] bg-white p-8 shadow-[0_4px_20px_rgba(102,126,234,0.08)] max-md:p-6 max-[480px]:rounded-[12px] max-[480px]:p-5"
              >
                <div className="mb-4 leading-none">
                  <span
                    style={matIcon}
                    className="text-[40px] text-[#667eea] max-md:text-[32px] max-[480px]:text-[28px]"
                  >
                    phone
                  </span>
                </div>
                <h2 className="mb-4 border-b-2 border-[rgba(102,126,234,0.1)] pb-3 text-[24px] font-extrabold text-[#1a1a2e] max-md:text-[20px] max-[480px]:text-[18px]">
                  Contact Us
                </h2>
                <p className="mb-4 text-[15px] leading-[1.8] text-[#4b5563] max-[480px]:text-[14px]">
                  For any questions regarding these Terms of Service, please
                  contact us:
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

export default TermsOfService;
