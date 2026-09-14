import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_DESIGN_WIDTH = 1152;

/**
 * Reusable hook for the browser Fullscreen API.
 * Uses a ResizeObserver to measure the actual rendered width of the target
 * element — when it enters fullscreen the element fills the screen, so its
 * measured width is the true screen width (reliable even inside an iframe
 * where window.innerWidth / screen.width don't report the fullscreen size).
 */
export function useFullscreen(designWidth = DEFAULT_DESIGN_WIDTH) {
  const ref = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elWidth, setElWidth] = useState(0);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

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

  const scale = isFullscreen && elWidth > 0 ? elWidth / designWidth : 1;

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  return { ref, isFullscreen, toggle, scale, designWidth };
}