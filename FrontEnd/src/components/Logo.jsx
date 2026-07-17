import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const Logo = ({ size = "default", linkTo = "/" }) => {
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
    small: { script: 24, tag: 9 },
    default: { script: 32, tag: 11 },
    large: { script: 44, tag: 13 },
    xl: { script: 60, tag: 16 },
  };

  const s = sizes[size] || sizes.default;

  const content = (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 1,
        textDecoration: "none",
      }}
    >
      <span
        style={{
          fontFamily: "'Great Vibes', cursive",
          fontSize: s.script,
          background:
            "linear-gradient(135deg, #831843 0%, #be185d 40%, #ec4899 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1.1,
          fontWeight: 400,
          filter: "drop-shadow(0 2px 4px rgba(190, 24, 93, 0.2))",
        }}
      >
        Talish
      </span>
      <span
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: s.tag,
          letterSpacing: "0.4em",
          color: "#831843",
          marginTop: 2,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        Clothes
      </span>
    </span>
  );

  if (!linkTo) {
    return <span style={{ display: "inline-block" }}>{content}</span>;
  }

  return (
    <Link
      to={linkTo}
      style={{ display: "inline-block", textDecoration: "none" }}
    >
      {content}
    </Link>
  );
};

export default Logo;
