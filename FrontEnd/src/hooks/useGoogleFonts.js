import { useEffect } from "react";
import { ensureGoogleFonts } from "../utils/fonts";

/**
 * Loads a Google Fonts stylesheet for a component, skipping families that the
 * document already requests. Replaces the copy-pasted
 * `useEffect(() => { document.createElement("link") ... })` block that existed
 * in ~25 components.
 */
const useGoogleFonts = (id, href) => {
  useEffect(() => {
    ensureGoogleFonts(id, href);
  }, [id, href]);
};

export default useGoogleFonts;
