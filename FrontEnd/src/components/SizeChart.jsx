import React, { useEffect } from "react";

const matIcon = {
  fontFamily: '"Material Symbols Outlined"',
  fontWeight: "normal",
  fontStyle: "normal",
  lineHeight: 1,
  display: "inline-block",
};

const CHARTS = {
  women: {
    title: "Women's Size Chart (inches)",
    headers: ["Size", "Bust", "Waist", "Hip", "Length"],
    rows: [
      ["XS", "34-35", "32-33", "36-37", "50"],
      ["S", "36-37", "34-35", "38-39", "50"],
      ["M", "38-39", "36-37", "40-41", "50"],
      ["L", "40-41", "38-39", "42-43", "50"],
      ["XL", "42-43", "40-41", "44-45", "50"],
      ["XXL", "44-45", "42-43", "46-47", "50"],
    ],
    note: "Measurements are in inches. For best fit, compare with a similar garment you own.",
  },
  men: {
    title: "Men's Size Chart (inches)",
    headers: ["Size", "Chest", "Shoulder", "Length", "Sleeve"],
    rows: [
      ["S", "36-38", "17", "27", "24"],
      ["M", "38-40", "18", "28", "24.5"],
      ["L", "40-42", "19", "29", "25"],
      ["XL", "42-44", "20", "30", "25.5"],
      ["XXL", "44-46", "21", "31", "26"],
      ["3XL", "46-48", "22", "32", "26.5"],
    ],
    note: "Measurements are in inches. Slight variations of 0.5 inches may occur.",
  },
  kids: {
    title: "Kids Size Chart",
    headers: ["Age", "Chest", "Length", "Height"],
    rows: [
      ["2-3Y", "22", "16", "35-37"],
      ["4-5Y", "24", "18", "39-41"],
      ["6-7Y", "26", "20", "43-45"],
      ["8-9Y", "28", "22", "47-49"],
      ["10-11Y", "30", "24", "51-53"],
      ["12-13Y", "32", "26", "55-57"],
    ],
    note: "Measurements are in inches. Age is approximate - use chest measurement for best fit.",
  },
  footwear: {
    title: "Footwear Size Chart",
    headers: ["UK/IND", "US", "EU", "Foot Length (inches)"],
    rows: [
      ["5", "6", "38", "9.6"],
      ["6", "7", "39", "9.9"],
      ["7", "8", "40", "10.2"],
      ["8", "9", "41", "10.5"],
      ["9", "10", "42", "10.8"],
      ["10", "11", "43", "11.1"],
      ["11", "12", "44", "11.4"],
    ],
    note: "Measure your foot from heel to longest toe. Add 0.3 inches for comfort.",
  },
};

export const getChartTypeForCategory = (category) => {
  if (!category) return null;
  const c = category.toLowerCase();
  if (c.includes("women")) return "women";
  if (c.includes("men") && !c.includes("women")) return "men";
  if (c.includes("kids") || c.includes("child")) return "kids";
  if (c.includes("footwear") || c.includes("shoe")) return "footwear";
  return null;
};

const SizeChart = ({ isOpen, onClose, category }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const chartType = getChartTypeForCategory(category);
  const chart = chartType ? CHARTS[chartType] : null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={onClose}
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-white shadow-2xl md:rounded-2xl"
        style={{ animation: "sc-slide 0.25s ease-out" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            background:
              "linear-gradient(135deg, #4a0e2e 0%, #831843 50%, #be185d 100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <span style={matIcon} className="text-[24px] text-white">
              straighten
            </span>
            <h2 className="m-0 text-lg font-bold text-white">
              {chart ? chart.title : "Size Guide"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <span style={matIcon} className="text-[20px]">
              close
            </span>
          </button>
        </div>

        <div className="max-h-[calc(90vh-70px)] overflow-y-auto p-5">
          {!chart ? (
            <div className="py-8 text-center">
              <span
                style={matIcon}
                className="mb-3 block text-[48px] text-gray-300"
              >
                info
              </span>
              <p className="m-0 text-sm text-gray-600">
                Size chart not available for this product category.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr
                      style={{
                        background: "linear-gradient(135deg, #fdf2f8, #fce7f3)",
                      }}
                    >
                      {chart.headers.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-pink-900"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chart.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        {row.map((cell, i) => (
                          <td
                            key={i}
                            className={`px-3 py-3 text-sm ${
                              i === 0
                                ? "font-bold text-pink-700"
                                : "text-gray-800"
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                <span
                  style={matIcon}
                  className="mt-0.5 text-[18px] text-amber-600"
                >
                  info
                </span>
                <p className="m-0 text-xs leading-relaxed text-amber-900">
                  {chart.note}
                </p>
              </div>

              <div className="mt-4 rounded-lg bg-pink-50 p-3">
                <h4 className="m-0 mb-2 flex items-center gap-1 text-sm font-bold text-pink-900">
                  <span style={matIcon} className="text-[18px]">
                    lightbulb
                  </span>
                  How to Measure
                </h4>
                <ul className="m-0 pl-5 text-xs text-pink-800">
                  {chartType === "women" && (
                    <>
                      <li className="mb-1">
                        <strong>Bust:</strong> Measure around the fullest part
                      </li>
                      <li className="mb-1">
                        <strong>Waist:</strong> Measure around the narrowest
                        part
                      </li>
                      <li>
                        <strong>Hip:</strong> Measure around the fullest part of
                        hips
                      </li>
                    </>
                  )}
                  {chartType === "men" && (
                    <>
                      <li className="mb-1">
                        <strong>Chest:</strong> Measure under arms across
                        fullest part
                      </li>
                      <li className="mb-1">
                        <strong>Shoulder:</strong> From shoulder seam to
                        shoulder seam
                      </li>
                      <li>
                        <strong>Length:</strong> From shoulder to bottom hem
                      </li>
                    </>
                  )}
                  {chartType === "kids" && (
                    <li>
                      Measure chest around the fullest part with arms relaxed at
                      sides
                    </li>
                  )}
                  {chartType === "footwear" && (
                    <li>
                      Place foot on paper, mark heel and longest toe, measure
                      the distance
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes sc-slide {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SizeChart;
