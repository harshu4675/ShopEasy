import React, { memo, useCallback, useEffect, useState } from "react";
import { resellerAPI, formatPrice, getErrorMessage } from "../../utils/api";
import { showToast } from "../../utils/toast";
import { matIcon } from "../../utils/fonts";

/**
 * Share sheet for a reseller listing.
 *
 * Channels:
 *  - WhatsApp / Telegram / Facebook / X  → web share intents
 *  - Instagram → no web intent exists, so the caption is copied to the
 *    clipboard and the app is opened, which is the standard workaround
 *  - Native share → uses navigator.share where supported (mobile)
 *  - Copy link → clipboard with a visible confirmation
 */

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", icon: "chat", color: "#25D366" },
  { key: "telegram", label: "Telegram", icon: "send", color: "#0088cc" },
  { key: "facebook", label: "Facebook", icon: "thumb_up", color: "#1877F2" },
  {
    key: "instagram",
    label: "Instagram",
    icon: "photo_camera",
    color: "#E4405F",
  },
];

const ShareDialog = ({ listingId, onClose }) => {
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await resellerAPI.getShareLinks(listingId);
        if (!cancelled) setShare(data.data);
      } catch (err) {
        if (!cancelled) showToast(getErrorMessage(err), "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = useCallback(async (text, tag) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      showToast("Copied to clipboard", "success");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showToast("Could not copy", "error");
    }
  }, []);

  const openChannel = useCallback(
    (key) => {
      if (!share) return;

      if (key === "instagram") {
        // Instagram can't accept a prefilled web share — copy + open the app.
        copy(share.channels.instagram.copyText, "instagram");
        window.open(share.channels.instagram.deepLink, "_blank", "noopener");
        return;
      }
      window.open(share.channels[key], "_blank", "noopener,noreferrer");
    },
    [share, copy],
  );

  const nativeShare = useCallback(async () => {
    if (!share || !navigator.share) return;
    try {
      await navigator.share({
        title: share.title,
        text: share.text,
        url: share.url,
      });
    } catch {
      /* user dismissed the sheet */
    }
  }, [share]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share product"
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-base font-bold text-gray-900">
            Share product
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-gray-100 text-gray-600"
          >
            <span style={matIcon} className="text-[18px]">
              close
            </span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
            <div className="h-16 animate-pulse rounded-xl bg-gray-200" />
            <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
          </div>
        ) : !share ? (
          <p className="py-6 text-center text-sm text-gray-500">
            Could not load share links.
          </p>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              {share.image && (
                <img
                  src={share.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain"
                />
              )}
              <div className="min-w-0">
                <p
                  className="m-0 text-sm font-semibold text-gray-900"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {share.title}
                </p>
                <p className="m-0 text-sm font-bold text-pink-600">
                  {formatPrice(share.price)}
                </p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => openChannel(c.key)}
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                    style={{ background: c.color }}
                  >
                    <span style={matIcon} className="text-[20px]">
                      {c.icon}
                    </span>
                  </span>
                  <span className="text-[10px] font-semibold text-gray-700">
                    {c.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-gray-600">
                {share.url}
              </span>
              <button
                onClick={() => copy(share.url, "link")}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border-none px-3 py-1.5 text-[11px] font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #831843, #ec4899)",
                }}
              >
                <span style={matIcon} className="text-[14px]">
                  {copied === "link" ? "check" : "content_copy"}
                </span>
                {copied === "link" ? "Copied" : "Copy"}
              </button>
            </div>

            <button
              onClick={() => copy(`${share.text} ${share.url}`, "caption")}
              className="mb-2 w-full cursor-pointer rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-50"
            >
              <span style={matIcon} className="mr-1.5 align-middle text-[16px]">
                {copied === "caption" ? "check" : "notes"}
              </span>
              {copied === "caption" ? "Caption copied" : "Copy caption + link"}
            </button>

            {typeof navigator !== "undefined" && navigator.share && (
              <button
                onClick={nativeShare}
                className="w-full cursor-pointer rounded-xl border-none py-2.5 text-xs font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                }}
              >
                <span
                  style={matIcon}
                  className="mr-1.5 align-middle text-[16px]"
                >
                  ios_share
                </span>
                More sharing options
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default memo(ShareDialog);
