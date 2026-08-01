import React, { memo, useMemo } from "react";

/**
 * Dependency-free SVG charts.
 *
 * Deliberately hand-rolled rather than pulling in Recharts/Chart.js: those add
 * 90-160 kB gzipped to the bundle, which would undo a large part of the
 * performance work for two charts on one authenticated route. These render as
 * inline SVG, cost nothing at runtime and inherit the existing pink palette.
 */

const PINK = "#ec4899";
const DARK_PINK = "#831843";

/** Area + line chart for a time series. */
export const LineChart = memo(
  ({ data = [], yKey = "earnings", height = 180, label = "" }) => {
    const { points, area, max, ticks } = useMemo(() => {
      if (!data.length) return { points: "", area: "", max: 0, ticks: [] };

      const values = data.map((d) => Number(d[yKey]) || 0);
      const maxV = Math.max(...values, 1);
      const w = 100;
      const step = data.length > 1 ? w / (data.length - 1) : 0;

      const coords = values.map((v, i) => {
        const x = data.length > 1 ? i * step : w / 2;
        const y = 100 - (v / maxV) * 92 - 4;
        return [x, y];
      });

      return {
        points: coords.map(([x, y]) => `${x},${y}`).join(" "),
        area: `0,100 ${coords.map(([x, y]) => `${x},${y}`).join(" ")} ${w},100`,
        max: maxV,
        ticks: [maxV, Math.round(maxV / 2), 0],
      };
    }, [data, yKey]);

    if (!data.length) {
      return (
        <div
          className="flex items-center justify-center rounded-xl bg-gray-50 text-xs text-gray-400"
          style={{ height }}
        >
          No data for this period
        </div>
      );
    }

    return (
      <div className="relative" style={{ height }}>
        <div className="absolute inset-y-0 left-0 flex w-10 flex-col justify-between py-1 text-[9px] text-gray-400">
          {ticks.map((t, i) => (
            <span key={i}>{t >= 1000 ? `${Math.round(t / 1000)}k` : t}</span>
          ))}
        </div>

        <div className="absolute inset-y-0 left-10 right-0">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-full w-full"
            role="img"
            aria-label={`${label} chart, peak ${max}`}
          >
            <defs>
              <linearGradient id="rs-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PINK} stopOpacity="0.35" />
                <stop offset="100%" stopColor={PINK} stopOpacity="0" />
              </linearGradient>
            </defs>

            {[4, 28, 52, 76, 96].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <polygon points={area} fill="url(#rs-area)" />
            <polyline
              points={points}
              fill="none"
              stroke={DARK_PINK}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
    );
  },
);
LineChart.displayName = "LineChart";

/** Horizontal bar chart, used for monthly earnings. */
export const BarChart = memo(({ data = [], labelKey, valueKey, formatter }) => {
  const max = useMemo(
    () => Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1),
    [data, valueKey],
  );

  if (!data.length) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl bg-gray-50 text-xs text-gray-400">
        No data yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const value = Number(d[valueKey]) || 0;
        const pct = (value / max) * 100;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-16 shrink-0 truncate text-[10px] text-gray-500">
              {d[labelKey]}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="flex h-full items-center justify-end rounded-full pr-2 transition-all duration-500"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: "linear-gradient(90deg, #831843, #ec4899)",
                }}
              >
                {pct > 25 && (
                  <span className="text-[9px] font-bold text-white">
                    {formatter ? formatter(value) : value}
                  </span>
                )}
              </div>
            </div>
            {pct <= 25 && (
              <span className="w-14 shrink-0 text-right text-[10px] font-semibold text-gray-700">
                {formatter ? formatter(value) : value}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});
BarChart.displayName = "BarChart";

/** Donut used for the conversion funnel summary. */
export const DonutChart = memo(({ value = 0, max = 100, label, sublabel }) => {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="10"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#rs-donut)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease-out" }}
          />
          <defs>
            <linearGradient id="rs-donut" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={DARK_PINK} />
              <stop offset="100%" stopColor={PINK} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold text-gray-900">{label}</span>
          {sublabel && (
            <span className="text-[9px] text-gray-500">{sublabel}</span>
          )}
        </div>
      </div>
    </div>
  );
});
DonutChart.displayName = "DonutChart";
