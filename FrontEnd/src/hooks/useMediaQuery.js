import { useEffect, useState } from "react";

const readQuery = (query) =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;

/** Subscribe to a CSS media query while also returning the right first render. */
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => readQuery(query));

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }
    const media = window.matchMedia(query);
    const update = (event) => setMatches(event.matches);
    setMatches(media.matches);
    if (media.addEventListener) {
      media.addEventListener("change", update);
    } else {
      // Safari < 14 uses the legacy listener API.
      media.addListener?.(update);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", update);
      } else {
        media.removeListener?.(update);
      }
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;
