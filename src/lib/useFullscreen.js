import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_DESIGN_WIDTH = 1152;

/**
 * Reusable hook for the browser Fullscreen API.
 * Returns a ref to attach to the target element, the current fullscreen state,
 * a toggle function, and a `scale` value (zoom factor to fill the viewport width)
 * plus the `designWidth` the caller should pin the content wrapper to.
 *
 * Uses a fixed design width instead of measuring the element, which avoids
 * timing issues when the element mounts after an async loading state.
 */
export function useFullscreen(designWidth = DEFAULT_DESIGN_WIDTH) {
  const ref = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewport, setViewport] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const scale = isFullscreen ? viewport.w / designWidth : 1;

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  return { ref, isFullscreen, toggle, scale, designWidth };
}