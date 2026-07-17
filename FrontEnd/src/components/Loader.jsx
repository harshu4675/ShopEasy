import React, { useEffect } from "react";

const Loader = ({ size = "default", fullScreen = false }) => {
  useEffect(() => {
    const fontId = "loader-tc-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Great+Vibes&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)",
        }}
      >
        <div className="flex flex-col items-center">
          <div
            className="relative flex items-center justify-center"
            style={{ width: 100, height: 100 }}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              style={{ animation: "tc-rotate 1.5s linear infinite" }}
            >
              <defs>
                <linearGradient
                  id="tc-ring"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#be185d" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="rgba(190, 24, 93, 0.1)"
                strokeWidth="3"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="url(#tc-ring)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="90 290"
                style={{
                  filter: "drop-shadow(0 0 6px rgba(236, 72, 153, 0.5))",
                }}
              />
            </svg>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <span
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: 44,
                background:
                  "linear-gradient(135deg, #831843 0%, #be185d 40%, #ec4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                lineHeight: 1,
                filter: "drop-shadow(0 2px 4px rgba(190, 24, 93, 0.2))",
              }}
            >
              Talish
            </span>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 12,
                letterSpacing: "0.45em",
                color: "#831843",
                fontWeight: 700,
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              Clothes
            </span>
          </div>
        </div>

        <style>{`
          @keyframes tc-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const smallSize = size === "small";
  const boxSize = smallSize ? 40 : 56;

  return (
    <div className="flex items-center justify-center py-10">
      <div
        className="relative flex items-center justify-center"
        style={{ width: boxSize, height: boxSize }}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${boxSize} ${boxSize}`}
          style={{ animation: "tc-mini-rotate 1.2s linear infinite" }}
        >
          <defs>
            <linearGradient
              id="tc-mini-ring"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#be185d" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle
            cx={boxSize / 2}
            cy={boxSize / 2}
            r={boxSize / 2 - 3}
            fill="none"
            stroke="rgba(190, 24, 93, 0.1)"
            strokeWidth="2.5"
          />
          <circle
            cx={boxSize / 2}
            cy={boxSize / 2}
            r={boxSize / 2 - 3}
            fill="none"
            stroke="url(#tc-mini-ring)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${(boxSize - 6) * 1.2} ${(boxSize - 6) * 3.14}`}
          />
        </svg>
      </div>

      <style>{`
        @keyframes tc-mini-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Loader;
