/**
 * Maps a product category to the size-chart variant that should be shown.
 * Lives outside the component module so importing it from a page does not
 * pull the chart markup in, and so the component file stays fast-refresh safe.
 */
export const getChartTypeForCategory = (category) => {
  if (!category) return null;

  const value = category.toLowerCase();
  if (value.includes("women")) return "women";
  if (value.includes("men")) return "men";
  if (value.includes("kids") || value.includes("child")) return "kids";
  if (value.includes("footwear") || value.includes("shoe")) return "footwear";
  return null;
};
