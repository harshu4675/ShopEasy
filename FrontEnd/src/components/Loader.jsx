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

  const TCIcon = ({ dim }) => (
    <svg width={dim} height={dim} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="tc-fill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4a0e2e" />
          <stop offset="25%" stopColor="#831843" />
          <stop offset="50%" stopColor="#be185d" />
          <stop offset="75%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id="tc-shine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <text
        x="50"
        y="72"
        textAnchor="middle"
        fontFamily="'Cinzel', serif"
        fontSize="72"
        fontWeight="900"
        fill="url(#tc-fill)"
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
        fill="url(#tc-shine)"
        style={{ letterSpacing: "-0.05em", mixBlendMode: "overlay" }}
      >
        TC
      </text>
    </svg>
  );

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
            style={{ width: 140, height: 140 }}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 140 140"
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
                cx="70"
                cy="70"
                r="64"
                fill="none"
                stroke="rgba(190, 24, 93, 0.1)"
                strokeWidth="3"
              />
              <circle
                cx="70"
                cy="70"
                r="64"
                fill="none"
                stroke="url(#tc-ring)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="120 402"
                style={{
                  filter: "drop-shadow(0 0 6px rgba(236, 72, 153, 0.5))",
                }}
              />
            </svg>

            <div style={{ animation: "tc-pulse 2s ease-in-out infinite" }}>
              <TCIcon dim={90} />
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <span
              className="font-normal leading-none"
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: 30,
                background:
                  "linear-gradient(135deg, #831843 0%, #be185d 40%, #ec4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Talish
            </span>
            <span
              className="mt-1 font-bold uppercase"
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 10,
                letterSpacing: "0.4em",
                color: "#831843",
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
          @keyframes tc-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
        `}</style>
      </div>
    );
  }

  const smallSize = size === "small";
  const boxSize = smallSize ? 50 : 70;
  const iconSize = smallSize ? 32 : 46;

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

        <TCIcon dim={iconSize} />
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
