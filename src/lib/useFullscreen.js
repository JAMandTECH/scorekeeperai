import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Reusable hook for the browser Fullscreen API.
 * Returns a ref to attach to the target element, the current fullscreen state,
 * a toggle function, and a `scale` value that represents the zoom factor needed
 * to fit the element's natural content size into the viewport while fullscreen.
 */
export function useFullscreen() {
  const ref = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewport, setViewport] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

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

  // Measure the element's natural (unscaled) size while NOT fullscreen so we
  // can compute the correct zoom factor once we enter fullscreen.
  useEffect(() => {
    if (isFullscreen) return;
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const prevZoom = el.style.zoom;
      el.style.zoom = "1";
      setNaturalSize({ w: el.scrollWidth, h: el.scrollHeight });
      el.style.zoom = prevZoom;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isFullscreen]);

  const scale =
    isFullscreen && naturalSize.w > 0 && naturalSize.h > 0
      ? Math.min(viewport.w / naturalSize.w, viewport.h / naturalSize.h)
      : 1;

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  return { ref, isFullscreen, toggle, scale };
}