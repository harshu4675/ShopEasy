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
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="#667eea"
        >
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      ),
      title: "Email Us",
      value: "harshu6278@gmail.com",
      link: "mailto:harshu6278@gmail.com",
      description: "We'll respond within 24 hours",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="#667eea"
        >
          <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
        </svg>
      ),
      title: "Call Us",
      value: "+91 78989 69930",
      link: "tel:+917898969930",
      description: "Mon-Sat, 9 AM - 6 PM",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="#667eea"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      ),
      title: "Visit Us",
      value: "Dhar Road, Indore",
      link: null,
      description: "Madhya Pradesh, India",
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
    "w-full py-3.5 pl-11 pr-3.5 border-2 border-[#e5e7eb] rounded-[12px] text-sm transition-all duration-300 bg-[#fafbff] focus:outline-none focus:border-[#667eea] focus:bg-white focus:shadow-[0_0_0_4px_rgba(102,126,234,0.1)] placeholder:text-[#adb5bd]";

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden pt-20 pb-[120px] md:pt-[60px] md:pb-[100px] sm:pt-[50px] sm:pb-20"
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
        <div className="max-w-[1400px] mx-auto px-5 relative z-10 text-center">
          <span
            className="text-[64px] block mb-5 md:text-5xl sm:text-[40px]"
            style={{ animation: "bounce 2s ease-in-out infinite" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="white"
              style={{ display: "inline-block" }}
            >
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </span>
          <h1 className="text-[42px] font-extrabold text-white mb-3 md:text-[32px] sm:text-[26px]">
            Get in Touch
          </h1>
          <p className="text-lg text-white/90 max-w-[500px] mx-auto md:text-base sm:text-sm">
            We'd love to hear from you! Send us a message and we'll respond as
            soon as possible.
          </p>
        </div>
        <div className="absolute bottom-[-1px] left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="block w-full h-20"
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .btn-loader {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        details[open] .toggle-icon {
          transform: rotate(45deg);
        }
        .toggle-icon {
          transition: transform 0.3s ease;
        }
        .quick-link:hover {
          transform: translateX(4px);
        }
      `}</style>

      {/* Contact Info Cards */}
      <div className="-mt-[60px] pb-10 relative z-10 sm:-mt-[50px]">
        <div className="max-w-[1400px] mx-auto px-5">
          <div className="grid grid-cols-3 gap-6 md:grid-cols-1 md:gap-4">
            {contactInfo.map((info, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl py-8 px-6 text-center shadow-[0_10px_40px_rgba(102,126,234,0.15)] border border-[rgba(102,126,234,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(102,126,234,0.2)] md:py-6 md:px-5 sm:py-5 sm:px-4"
              >
                <div className="text-[40px] mb-4 block flex justify-center sm:text-[32px]">
                  {info.icon}
                </div>
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-2.5 md:text-base sm:text-base">
                  {info.title}
                </h3>
                {info.link ? (
                  <a
                    href={info.link}
                    className="block text-base font-semibold text-[#667eea] no-underline mb-1.5 transition-colors duration-300 hover:text-[#764ba2] sm:text-sm"
                  >
                    {info.value}
                  </a>
                ) : (
                  <span className="block text-base font-semibold text-[#667eea] mb-1.5 sm:text-sm">
                    {info.value}
                  </span>
                )}
                <p className="text-[13px] text-[#6b7280] m-0">
                  {info.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-10 pb-[60px] md:py-[30px] md:pb-[50px]">
        <div className="max-w-[1400px] mx-auto px-5">
          <div className="grid grid-cols-[1.2fr_1fr] gap-10 items-start lg:grid-cols-1 lg:gap-8">
            {/* Contact Form */}
            <div className="bg-white rounded-[20px] p-9 shadow-[0_8px_30px_rgba(102,126,234,0.1)] border border-[rgba(102,126,234,0.06)] md:p-7 sm:p-6 sm:rounded-2xl">
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold text-[#1a1a2e] mb-2 md:text-xl sm:text-lg">
                  Send us a Message
                </h2>
                <p className="text-sm text-[#6b7280] m-0">
                  Fill out the form below and we'll get back to you shortly.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-1 sm:gap-0">
                  <div className="mb-5 sm:mb-4">
                    <label className="block text-[13px] font-semibold text-[#374151] mb-2">
                      Full Name *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 z-10">
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
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your name"
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mb-5 sm:mb-4">
                    <label className="block text-[13px] font-semibold text-[#374151] mb-2">
                      Email Address *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 z-10">
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
                        id="email"
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

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-1 sm:gap-0">
                  <div className="mb-5 sm:mb-4">
                    <label className="block text-[13px] font-semibold text-[#374151] mb-2">
                      Phone Number
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 z-10">
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
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter your phone number"
                        maxLength="10"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mb-5 sm:mb-4">
                    <label className="block text-[13px] font-semibold text-[#374151] mb-2">
                      Subject *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 z-10">
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
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className={`${inputClass} cursor-pointer appearance-none`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 14px center",
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

                <div className="mb-5 sm:mb-4">
                  <label className="block text-[13px] font-semibold text-[#374151] mb-2">
                    Message *
                  </label>
                  <div className="relative flex items-start">
                    <span className="absolute left-3.5 top-3.5 z-10">
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
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Write your message here..."
                      rows="5"
                      required
                      className={`${inputClass} resize-y min-h-[120px] sm:py-3 sm:pl-10 sm:text-sm`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-content-center gap-2.5 py-4 px-6 text-base font-bold rounded-[12px] border-none text-white cursor-pointer transition-all duration-300 shadow-[0_4px_15px_rgba(102,126,234,0.3)] hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_8px_25px_rgba(102,126,234,0.4)] disabled:opacity-70 disabled:cursor-not-allowed sm:py-3.5 sm:text-[15px] justify-center"
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
                        width="20"
                        height="20"
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

            {/* FAQ Section */}
            <div className="sticky top-[100px] lg:static">
              <div className="mb-6">
                <h2 className="text-[22px] font-extrabold text-[#1a1a2e] mb-1.5 md:text-xl sm:text-xl">
                  Frequently Asked Questions
                </h2>
                <p className="text-sm text-[#6b7280] m-0">
                  Quick answers to common questions
                </p>
              </div>

              <div className="flex flex-col gap-3 mb-8">
                {faqs.map((faq, index) => (
                  <details
                    key={index}
                    className="bg-white rounded-[12px] border border-[rgba(102,126,234,0.08)] overflow-hidden transition-all duration-300 hover:border-[rgba(102,126,234,0.2)] open:shadow-[0_6px_20px_rgba(102,126,234,0.12)] group"
                  >
                    <summary className="flex items-center gap-3 py-[18px] px-5 cursor-pointer text-sm font-semibold text-[#1a1a2e] list-none transition-all duration-300 hover:bg-[rgba(102,126,234,0.04)] sm:py-3.5 sm:px-4 sm:text-[13px]">
                      <span className="text-lg">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="#667eea"
                        >
                          <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
                        </svg>
                      </span>
                      {faq.question}
                      <span className="toggle-icon ml-auto text-xl font-light text-[#667eea]">
                        +
                      </span>
                    </summary>
                    <div className="pt-0 pb-[18px] px-5 pl-[50px] sm:pb-3.5 sm:px-4 sm:pl-11">
                      <p className="text-sm leading-[1.7] text-[#6b7280] m-0 sm:text-[13px]">
                        {faq.answer}
                      </p>
                    </div>
                  </details>
                ))}
              </div>

              <div
                className="rounded-2xl p-6 sm:p-5"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%)",
                }}
              >
                <h3 className="text-base font-bold text-[#1a1a2e] mb-4">
                  Quick Links
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                  {[
                    {
                      href: "/my-orders",
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
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
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                        </svg>
                      ),
                      label: "Terms of Service",
                    },
                    {
                      href: "/privacy",
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                        </svg>
                      ),
                      label: "Privacy Policy",
                    },
                    {
                      href: "/coupons",
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2z" />
                        </svg>
                      ),
                      label: "View Coupons",
                    },
                  ].map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="quick-link flex items-center gap-2.5 py-3.5 px-4 bg-white rounded-[10px] no-underline text-[#4b5563] text-[13px] font-semibold transition-all duration-300 border border-transparent hover:border-[#667eea] hover:text-[#667eea] sm:py-3 sm:px-3.5 sm:text-xs"
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

      {/* Response Time Banner */}
      <div
        className="py-8 sm:py-6"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-5">
          <div className="flex items-center justify-center gap-5 text-center sm:flex-col sm:gap-3.5">
            <div className="text-[40px] sm:text-[32px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="white"
              >
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white m-0 mb-1 sm:text-lg sm:text-base">
                We typically respond within 24 hours
              </h3>
              <p className="text-sm text-white/85 m-0 sm:text-xs">
                Our support team is available Monday to Saturday, 9 AM to 6 PM
                IST
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
