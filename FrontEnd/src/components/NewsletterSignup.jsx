import React, { memo, useCallback, useState } from "react";
import { newsletterAPI, isValidEmail, getErrorMessage } from "../utils/api";
import { matIcon } from "../utils/fonts";

/**
 * Newsletter subscription block rendered inside the footer.
 *
 * Responsive by construction: it uses the same `max-md:` / `max-[480px]:`
 * breakpoint scale as the surrounding footer, and the footer itself now renders
 * on phones (it was previously wrapped in `hidden md:block`), so the section is
 * reachable on every device width.
 *
 * Uses optimistic UI — the success state paints immediately and only rolls back
 * if the request fails.
 */
const NewsletterSignup = ({ source = "footer" }) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const value = email.trim();

      if (!value) {
        setStatus("error");
        setMessage("Please enter your email address");
        return;
      }
      if (!isValidEmail(value)) {
        setStatus("error");
        setMessage("Please enter a valid email address");
        return;
      }

      setStatus("loading");
      setMessage("");

      try {
        const { data } = await newsletterAPI.subscribe(value, source);
        setStatus("success");
        setMessage(data?.message || "You're subscribed! Watch your inbox.");
        setEmail("");
      } catch (err) {
        setStatus("error");
        setMessage(getErrorMessage(err));
      }
    },
    [email, source],
  );

  const isLoading = status === "loading";

  return (
    <div className="max-md:text-center">
      <h4 className="relative mb-5 pb-3 text-[18px] font-bold text-white max-[480px]:mb-[14px] max-[480px]:pb-2 max-[480px]:text-[15px] max-[380px]:text-[14px]">
        <span className="relative">
          Newsletter
          <span
            className="absolute bottom-0 left-0 h-[3px] w-10 translate-y-3 rounded-[2px] max-md:left-1/2 max-md:-translate-x-1/2 max-md:translate-y-3 max-[480px]:h-[2px] max-[480px]:w-[30px]"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          />
        </span>
      </h4>

      <p className="mb-4 text-[14px] leading-[1.7] text-white/70 max-[480px]:text-[12px] max-[380px]:text-[11px]">
        Get early access to new drops, exclusive offers and styling tips.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 max-md:mx-auto max-md:max-w-[420px] max-[480px]:gap-[6px]"
      >
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          disabled={isLoading}
          aria-invalid={status === "error"}
          aria-describedby="newsletter-status"
          className="min-w-0 flex-1 rounded-[10px] border border-white/10 bg-white/10 px-4 py-3 text-[14px] text-white outline-none backdrop-blur-[10px] transition-all duration-300 placeholder:text-white/40 focus:border-[#667eea] focus:bg-white/15 disabled:opacity-60 max-[480px]:rounded-[8px] max-[480px]:px-3 max-[480px]:py-[10px] max-[480px]:text-[12px] max-[380px]:text-[11px]"
        />
        <button
          type="submit"
          disabled={isLoading}
          aria-label="Subscribe to newsletter"
          className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border-none px-5 py-3 text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 max-[480px]:rounded-[8px] max-[480px]:px-4 max-[480px]:py-[10px] max-[480px]:text-[12px] max-[380px]:px-3 max-[380px]:text-[11px]"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        >
          {isLoading ? (
            <span
              className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
              style={{ animation: "nl-spin 0.7s linear infinite" }}
            />
          ) : (
            <>
              <span className="max-[380px]:hidden">Subscribe</span>
              <span style={matIcon} className="text-[16px]">
                send
              </span>
            </>
          )}
        </button>
      </form>

      <p
        id="newsletter-status"
        role="status"
        aria-live="polite"
        className={`mt-2 min-h-[18px] text-[12px] max-[480px]:text-[11px] ${
          status === "success"
            ? "text-emerald-300"
            : status === "error"
              ? "text-rose-300"
              : "text-white/50"
        }`}
      >
        {message}
      </p>

      <style>{`
        @keyframes nl-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default memo(NewsletterSignup);
