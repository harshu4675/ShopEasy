import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const Logo = ({ size = "default", showText = true, linkTo = "/" }) => {
  useEffect(() => {
    const fontId = "tc-logo-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Great+Vibes&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const sizes = {
    small: { icon: 40, monogram: 30, script: 15, tag: 8, gap: 8 },
    default: { icon: 52, monogram: 40, script: 20, tag: 9, gap: 10 },
    large: { icon: 72, monogram: 56, script: 30, tag: 11, gap: 12 },
    xl: { icon: 100, monogram: 78, script: 42, tag: 13, gap: 16 },
  };

  const s = sizes[size] || sizes.default;

  const gradientId = `tc-grad-${size}`;
  const shineId = `tc-shine-${size}`;
  const strokeId = `tc-stroke-${size}`;

  const content = (
    <div className="inline-flex items-center" style={{ gap: s.gap }}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 100 100"
        style={{
          filter: "drop-shadow(0 2px 4px rgba(190, 24, 93, 0.25))",
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a0e2e" />
            <stop offset="25%" stopColor="#831843" />
            <stop offset="50%" stopColor="#be185d" />
            <stop offset="75%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <linearGradient id={shineId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#831843" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
        </defs>

        <text
          x="50"
          y="72"
          textAnchor="middle"
          fontFamily="'Cinzel', serif"
          fontSize="72"
          fontWeight="900"
          fill={`url(#${gradientId})`}
          stroke={`url(#${strokeId})`}
          strokeWidth="1"
          style={{ letterSpacing: "-0.05em" }}
        >
          TC
        </text>

        <text
          x="50"
          y="72"
          textAnchor="middle"
          fontFamily="'Cinzel', serif"
          fontSize="72"
          fontWeight="900"
          fill={`url(#${shineId})`}
          style={{ letterSpacing: "-0.05em", mixBlendMode: "overlay" }}
        >
          TC
        </text>
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className="font-normal"
            style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: s.script,
              background:
                "linear-gradient(135deg, #831843 0%, #be185d 40%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.1,
              letterSpacing: "0.01em",
              filter: "drop-shadow(0 1px 1px rgba(190, 24, 93, 0.15))",
            }}
          >
            Talish
          </span>
          <span
            className="font-bold uppercase"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: s.tag,
              letterSpacing: "0.4em",
              color: "#831843",
              marginTop: 2,
              marginLeft: 2,
            }}
          >
            Clothes
          </span>
        </div>
      )}
    </div>
  );

  if (!linkTo) return content;

  return (
    <Link to={linkTo} className="no-underline">
      {content}
    </Link>
  );
};

export default Logo;
