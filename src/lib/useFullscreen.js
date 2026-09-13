import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Reusable hook for the browser Fullscreen API.
 * Returns a ref to attach to the target element, the current fullscreen state,
 * and a toggle function. All children of the ref'd element remain visible
 * in fullscreen — used by the scoreboard card and the live stream video area.
 */
export function useFullscreen() {
  const ref = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  return { ref, isFullscreen, toggle };
}