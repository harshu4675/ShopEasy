import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resellerAPI, getErrorMessage } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";
import useGoogleFonts from "../../hooks/useGoogleFonts";
import useReseller from "../../hooks/useReseller";
import {
  ResellerGate,
  PrimaryButton,
} from "../../components/reseller/ResellerUI";

/**
 * Reseller onboarding form.
 *
 * Two steps kept on one screen (store details, then payout) so a first-time
 * user can see the whole commitment before submitting. A `?ref=CODE` query
 * param pre-fills the referral field from a shared invite link.
 */

const BENEFITS = [
  {
    icon: "payments",
    title: "Set your own margin",
    desc: "Choose your profit on every product you share.",
  },
  {
    icon: "share",
    title: "Share anywhere",
    desc: "WhatsApp, Instagram, Facebook, Telegram — one tap.",
  },
  {
    icon: "account_balance_wallet",
    title: "Fast payouts",
    desc: "Withdraw to UPI or your bank from ₹100.",
  },
  {
    icon: "group_add",
    title: "Earn from referrals",
    desc: "Invite other resellers and earn a share of their commission.",
  },
];

/**
 * Field wrapper and input styling.
 *
 * These must live at module scope. Defining a component inside another
 * component's body creates a brand-new component type on every render, so
 * React unmounts the old subtree and mounts a fresh one. For an input that
 * means the DOM node is replaced on every keystroke and the field loses focus,
 * which on mobile closes the keyboard after a single character.
 */
const inputClass = (hasError) =>
  `w-full rounded-xl border-2 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 ${
    hasError
      ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
      : "border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
  }`;

const Field = ({ label, error, hint, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
      {label}
    </label>
    {children}
    {error ? (
      <p className="m-0 mt-1 text-[11px] text-rose-600">{error}</p>
    ) : (
      hint && <p className="m-0 mt-1 text-[11px] text-gray-400">{hint}</p>
    )}
  </div>
);

const ResellerApply = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { reseller, loading: profileLoading, status } = useReseller();

  useGoogleFonts(
    "reseller-apply-fonts",
    "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap",
  );

  const [form, setForm] = useState({
    storeName: "",
    whatsappNumber: "",
    bio: "",
    referralCode: "",
    payoutMethod: "UPI",
    upiId: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    panNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setForm((p) => ({ ...p, referralCode: ref.toUpperCase() }));
  }, [searchParams]);

  const update = useCallback((field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => (p[field] ? { ...p, [field]: undefined } : p));
  }, []);

  const validate = () => {
    const e = {};
    if (form.storeName.trim().length < 3) {
      e.storeName = "Store name must be at least 3 characters";
    }
    if (form.whatsappNumber && !/^[0-9]{10}$/.test(form.whatsappNumber)) {
      e.whatsappNumber = "Enter a valid 10-digit number";
    }
    if (form.payoutMethod === "UPI") {
      if (!form.upiId || !/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/.test(form.upiId)) {
        e.upiId = "Enter a valid UPI ID (e.g. name@bank)";
      }
    } else {
      if (!form.accountHolderName.trim()) {
        e.accountHolderName = "Account holder name is required";
      }
      if (!/^\d{6,20}$/.test(form.accountNumber)) {
        e.accountNumber = "Enter a valid account number";
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifscCode)) {
        e.ifscCode = "Enter a valid IFSC code";
      }
    }
    if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.panNumber)) {
      e.panNumber = "Enter a valid PAN number";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast("Please fix the highlighted fields", "error");
      return;
    }

    setSubmitting(true);
    try {
      await resellerAPI.apply({
        storeName: form.storeName.trim(),
        whatsappNumber: form.whatsappNumber || undefined,
        bio: form.bio || undefined,
        referralCode: form.referralCode || undefined,
        payout:
          form.payoutMethod === "UPI"
            ? { method: "UPI", upiId: form.upiId }
            : {
                method: "BANK",
                accountHolderName: form.accountHolderName,
                accountNumber: form.accountNumber,
                ifscCode: form.ifscCode.toUpperCase(),
                bankName: form.bankName,
              },
        kyc: form.panNumber
          ? { panNumber: form.panNumber.toUpperCase() }
          : undefined,
      });

      showToast("Application submitted! We'll review it shortly.", "success");
      navigate("/reseller", { replace: true });
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
        <span
          className="inline-block h-10 w-10 rounded-full border-[3px] border-pink-100 border-t-pink-500"
          style={{ animation: "ra-spin 0.8s linear infinite" }}
        />
        <style>{`@keyframes ra-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Already applied: show the appropriate status screen instead of the form.
  if (reseller) {
    return (
      <div
        className="min-h-screen bg-gray-50"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <ResellerGate status={status} message={reseller.statusReason} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 pb-10"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div
        className="px-6 py-10 text-center text-white max-md:px-4 max-md:py-8"
        style={{
          background:
            "linear-gradient(135deg, #4a0e2e 0%, #831843 50%, #be185d 100%)",
        }}
      >
        <span style={matIcon} className="mb-2 block text-[44px]">
          storefront
        </span>
        <h1 className="m-0 text-3xl font-extrabold max-md:text-2xl">
          Become a Reseller
        </h1>
        <p className="mx-auto m-0 mt-2 max-w-lg text-sm text-pink-100">
          Turn your network into income. Share products, set your margin, and
          get paid — no inventory, no upfront cost.
        </p>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 pt-6 max-md:px-3">
        <div className="mb-6 grid grid-cols-4 gap-3 max-md:grid-cols-2">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm"
            >
              <div
                className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
                }}
              >
                <span style={matIcon} className="text-[22px] text-pink-600">
                  {b.icon}
                </span>
              </div>
              <h3 className="m-0 mb-1 text-sm font-bold text-gray-900">
                {b.title}
              </h3>
              <p className="m-0 text-[11px] leading-relaxed text-gray-500">
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm max-md:p-4"
        >
          <h2 className="m-0 mb-1 text-lg font-bold text-gray-900">
            Store details
          </h2>
          <p className="m-0 mb-5 text-xs text-gray-500">
            This is how customers will see your store.
          </p>

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <Field label="Store name *" error={errors.storeName}>
              <input
                type="text"
                value={form.storeName}
                onChange={(e) => update("storeName", e.target.value)}
                placeholder="e.g. Priya's Fashion Corner"
                maxLength={60}
                className={inputClass(!!errors.storeName)}
              />
            </Field>

            <Field
              label="WhatsApp number"
              error={errors.whatsappNumber}
              hint="Customers can reach you here"
            >
              <input
                type="tel"
                inputMode="numeric"
                value={form.whatsappNumber}
                onChange={(e) =>
                  update(
                    "whatsappNumber",
                    e.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                placeholder="10-digit number"
                className={inputClass(!!errors.whatsappNumber)}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="Short bio"
              error={errors.bio}
              hint="Optional — shown on your store page"
            >
              <textarea
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="Tell customers what you sell…"
                maxLength={300}
                rows={2}
                className={`${inputClass(!!errors.bio)} resize-none`}
              />
            </Field>
          </div>

          <div className="my-6 h-px bg-gray-100" />

          <h2 className="m-0 mb-1 text-lg font-bold text-gray-900">
            Payout details
          </h2>
          <p className="m-0 mb-4 text-xs text-gray-500">
            Where should we send your earnings?
          </p>

          <div className="mb-4 flex gap-2">
            {["UPI", "BANK"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update("payoutMethod", m)}
                className={`flex-1 cursor-pointer rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                  form.payoutMethod === m
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-pink-200"
                }`}
              >
                <span
                  style={matIcon}
                  className="mr-1.5 align-middle text-[18px]"
                >
                  {m === "UPI" ? "smartphone" : "account_balance"}
                </span>
                {m === "UPI" ? "UPI" : "Bank Transfer"}
              </button>
            ))}
          </div>

          {form.payoutMethod === "UPI" ? (
            <Field
              label="UPI ID *"
              error={errors.upiId}
              hint="e.g. yourname@paytm"
            >
              <input
                type="text"
                value={form.upiId}
                onChange={(e) => update("upiId", e.target.value.trim())}
                placeholder="yourname@bank"
                autoCapitalize="none"
                className={inputClass(!!errors.upiId)}
              />
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <Field
                label="Account holder name *"
                error={errors.accountHolderName}
              >
                <input
                  type="text"
                  value={form.accountHolderName}
                  onChange={(e) => update("accountHolderName", e.target.value)}
                  placeholder="As per bank records"
                  className={inputClass(!!errors.accountHolderName)}
                />
              </Field>
              <Field label="Account number *" error={errors.accountNumber}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.accountNumber}
                  onChange={(e) =>
                    update(
                      "accountNumber",
                      e.target.value.replace(/\D/g, "").slice(0, 20),
                    )
                  }
                  placeholder="Bank account number"
                  className={inputClass(!!errors.accountNumber)}
                />
              </Field>
              <Field label="IFSC code *" error={errors.ifscCode}>
                <input
                  type="text"
                  value={form.ifscCode}
                  onChange={(e) =>
                    update(
                      "ifscCode",
                      e.target.value.toUpperCase().slice(0, 11),
                    )
                  }
                  placeholder="e.g. HDFC0001234"
                  className={inputClass(!!errors.ifscCode)}
                />
              </Field>
              <Field label="Bank name" error={errors.bankName}>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => update("bankName", e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className={inputClass(!!errors.bankName)}
                />
              </Field>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <Field
              label="PAN number"
              error={errors.panNumber}
              hint="Optional — needed above ₹20,000/yr"
            >
              <input
                type="text"
                value={form.panNumber}
                onChange={(e) =>
                  update("panNumber", e.target.value.toUpperCase().slice(0, 10))
                }
                placeholder="ABCDE1234F"
                className={inputClass(!!errors.panNumber)}
              />
            </Field>
            <Field
              label="Referral code"
              error={errors.referralCode}
              hint="If someone invited you"
            >
              <input
                type="text"
                value={form.referralCode}
                onChange={(e) =>
                  update(
                    "referralCode",
                    e.target.value.toUpperCase().slice(0, 20),
                  )
                }
                placeholder="REFXXXXXX"
                className={inputClass(!!errors.referralCode)}
              />
            </Field>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 max-md:flex-col max-md:items-stretch">
            <p className="m-0 text-[11px] text-gray-400">
              By applying you agree to our reseller terms and commission policy.
            </p>
            <PrimaryButton type="submit" loading={submitting} icon="send">
              {submitting ? "Submitting…" : "Submit application"}
            </PrimaryButton>
          </div>
        </form>
      </div>

      <style>{`@keyframes rs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ResellerApply;
