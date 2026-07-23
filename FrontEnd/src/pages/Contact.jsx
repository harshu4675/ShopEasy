import React, { useState } from "react";
import { showToast } from "../utils/toast";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      showToast(
        "Message sent successfully! We'll get back to you soon.",
        "success",
      );
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setLoading(false);
    }, 1500);
  };

  const contactInfo = [
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="#667eea"
        >
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      ),
      title: "Email Support",
      value: "Send us a message",
      link: null,
      description: "Use the contact form below",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="#667eea"
        >
          <path d="M12 6v6l4 2 .75-1.23-3.75-2.27V6zM12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
        </svg>
      ),
      title: "Response Time",
      value: "Within 24 hours",
      link: null,
      description: "Mon-Sat, 9 AM - 6 PM IST",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="#667eea"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      ),
      title: "Serving Across India",
      value: "PAN India Delivery",
      link: null,
      description: "Fast & reliable shipping",
    },
  ];

  const faqs = [
    {
      question: "How can I track my order?",
      answer:
        "You can track your order from the 'My Orders' section in your account. You'll also receive tracking updates via email and SMS.",
    },
    {
      question: "What is your return policy?",
      answer:
        "We offer a 7-day return policy. Products must be unused and in original condition with tags intact.",
    },
    {
      question: "How long does delivery take?",
      answer:
        "Standard delivery takes 7-8 business days. You'll receive tracking information once your order is shipped.",
    },
    {
      question: "Is Cash on Delivery available?",
      answer:
        "Yes! We accept Cash on Delivery (COD) along with Cards, UPI, and Digital Wallets.",
    },
  ];

  const inputClass =
    "w-full py-3 pl-10 pr-3 border-2 border-[#e5e7eb] rounded-xl text-sm transition-all duration-300 bg-[#fafbff] focus:outline-none focus:border-[#667eea] focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] placeholder:text-[#adb5bd]";

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <div
        className="relative overflow-hidden px-4 pb-24 pt-10 max-md:pb-16 max-md:pt-8"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 mx-auto max-w-[1400px] text-center">
          <div className="mb-4 inline-flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="white"
              style={{ animation: "bounce 2s ease-in-out infinite" }}
            >
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <h1 className="mb-3 text-3xl font-extrabold text-white max-md:text-2xl">
            Get in Touch
          </h1>
          <p className="mx-auto max-w-[500px] text-sm text-white/90 max-md:text-xs">
            We'd love to hear from you! Send us a message and we'll respond as
            soon as possible.
          </p>
        </div>
        <div className="absolute bottom-[-1px] left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="block h-16 w-full"
          >
            <path
              d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
              fill="#f8f9ff"
            />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn-loader {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        details[open] .toggle-icon { transform: rotate(45deg); }
        .toggle-icon { transition: transform 0.3s ease; }
      `}</style>

      <div className="relative z-10 -mt-12 px-4 pb-6 max-md:-mt-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1 max-md:gap-3">
            {contactInfo.map((info, index) => (
              <div
                key={index}
                className="rounded-2xl border border-[rgba(102,126,234,0.08)] bg-white px-4 py-5 text-center shadow-[0_10px_40px_rgba(102,126,234,0.15)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(102,126,234,0.2)]"
              >
                <div className="mb-3 flex justify-center">{info.icon}</div>
                <h3 className="mb-2 text-base font-bold text-[#1a1a2e]">
                  {info.title}
                </h3>
                {info.link ? (
                  <a
                    href={info.link}
                    className="mb-1 block text-sm font-semibold text-[#667eea] no-underline transition-colors duration-300 hover:text-[#764ba2]"
                  >
                    {info.value}
                  </a>
                ) : (
                  <span className="mb-1 block text-sm font-semibold text-[#667eea]">
                    {info.value}
                  </span>
                )}
                <p className="m-0 text-xs text-[#6b7280]">{info.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 pb-10 max-md:py-4">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-[1.2fr_1fr] items-start gap-8 max-lg:grid-cols-1 max-lg:gap-6">
            <div className="rounded-2xl border border-[rgba(102,126,234,0.06)] bg-white p-6 shadow-[0_8px_30px_rgba(102,126,234,0.1)] max-md:p-4">
              <div className="mb-5">
                <h2 className="mb-2 text-xl font-extrabold text-[#1a1a2e] max-md:text-lg">
                  Send us a Message
                </h2>
                <p className="m-0 text-sm text-[#6b7280] max-md:text-xs">
                  Fill out the form below and we'll get back to you shortly.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1 max-md:gap-0">
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-semibold text-[#374151]">
                      Full Name *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 z-10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="#6b7280"
                        >
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your name"
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-semibold text-[#374151]">
                      Email Address *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 z-10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="#6b7280"
                        >
                          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                      </span>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1 max-md:gap-0">
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-semibold text-[#374151]">
                      Phone Number
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 z-10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="#6b7280"
                        >
                          <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
                        </svg>
                      </span>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter your phone number"
                        maxLength="10"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-semibold text-[#374151]">
                      Subject *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 z-10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="#6b7280"
                        >
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </span>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className={`${inputClass} cursor-pointer appearance-none pr-8`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                        }}
                      >
                        <option value="">Select a subject</option>
                        <option value="order">Order Related</option>
                        <option value="return">Return/Refund</option>
                        <option value="product">Product Inquiry</option>
                        <option value="payment">Payment Issue</option>
                        <option value="feedback">Feedback</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold text-[#374151]">
                    Message *
                  </label>
                  <div className="relative flex items-start">
                    <span className="absolute left-3 top-3 z-10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="#6b7280"
                      >
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                      </svg>
                    </span>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Write your message here..."
                      rows="5"
                      required
                      className={`${inputClass} min-h-[120px] resize-y`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-none px-6 py-3.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(102,126,234,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  {loading ? (
                    <>
                      <span className="btn-loader"></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="white"
                      >
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="lg:sticky lg:top-[100px]">
              <div className="mb-4">
                <h2 className="mb-1 text-xl font-extrabold text-[#1a1a2e] max-md:text-lg">
                  Frequently Asked Questions
                </h2>
                <p className="m-0 text-sm text-[#6b7280] max-md:text-xs">
                  Quick answers to common questions
                </p>
              </div>

              <div className="mb-6 flex flex-col gap-2">
                {faqs.map((faq, index) => (
                  <details
                    key={index}
                    className="group overflow-hidden rounded-xl border border-[rgba(102,126,234,0.08)] bg-white transition-all duration-300 hover:border-[rgba(102,126,234,0.2)] open:shadow-[0_6px_20px_rgba(102,126,234,0.12)]"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[#1a1a2e] transition-all duration-300 hover:bg-[rgba(102,126,234,0.04)] max-md:text-xs">
                      <span className="shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="#667eea"
                        >
                          <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
                        </svg>
                      </span>
                      <span className="flex-1">{faq.question}</span>
                      <span className="toggle-icon shrink-0 text-lg font-light text-[#667eea]">
                        +
                      </span>
                    </summary>
                    <div className="px-4 pb-3 pl-10 pt-0">
                      <p className="m-0 text-xs leading-relaxed text-[#6b7280]">
                        {faq.answer}
                      </p>
                    </div>
                  </details>
                ))}
              </div>

              <div
                className="rounded-2xl p-4"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%)",
                }}
              >
                <h3 className="mb-3 text-sm font-bold text-[#1a1a2e]">
                  Quick Links
                </h3>
                <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
                  {[
                    {
                      href: "/my-orders",
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M20 2H4v2l4.86 4.86C7.74 10.22 7 11.79 7 13.5 7 17.09 9.91 20 13.5 20c1.71 0 3.28-.74 4.64-1.86L23 23l1.27-1.27L20 17.27V2zm-6.5 16C11.01 18 9 15.99 9 13.5S11.01 9 13.5 9 18 11.01 18 13.5 15.99 18 13.5 18z" />
                        </svg>
                      ),
                      label: "Track Order",
                    },
                    {
                      href: "/terms",
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                        </svg>
                      ),
                      label: "Terms",
                    },
                    {
                      href: "/privacy",
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                        </svg>
                      ),
                      label: "Privacy",
                    },
                    {
                      href: "/coupons",
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2z" />
                        </svg>
                      ),
                      label: "Coupons",
                    },
                  ].map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 rounded-lg border border-transparent bg-white px-3 py-2.5 text-xs font-semibold text-[#4b5563] no-underline transition-all duration-300 hover:border-[#667eea] hover:text-[#667eea]"
                    >
                      {link.icon}
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="px-4 py-6 max-md:py-4"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div className="mx-auto max-w-[1400px]">
          <div className="flex items-center justify-center gap-3 text-center max-md:flex-col max-md:gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
            </svg>
            <div>
              <h3 className="m-0 mb-1 text-base font-bold text-white max-md:text-sm">
                We typically respond within 24 hours
              </h3>
              <p className="m-0 text-xs text-white/85 max-md:text-[11px]">
                Monday to Saturday, 9 AM to 6 PM IST
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
