import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_DESIGN_WIDTH = 1152;

/**
 * CSS-based fullscreen: uses position:fixed overlay instead of the browser
 * Fullscreen API (which is blocked inside the app preview iframe). A
 * ResizeObserver measures the overlay's actual width to compute the scale
 * factor that fills the viewport.
 */
export function useFullscreen(designWidth = DEFAULT_DESIGN_WIDTH) {
  const ref = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elWidth, setElWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setElWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [isFullscreen]);

  const scale = isFullscreen && elWidth > 0 ? elWidth / designWidth : 1;

  const toggle = useCallback(() => setIsFullscreen((prev) => !prev), []);

  return { ref, isFullscreen, toggle, scale, designWidth };
}