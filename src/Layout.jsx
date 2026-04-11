import React, { useEffect } from "react";
import "./globals.css";

export default function Layout({ children, currentPageName }) {
  useEffect(() => {
    // Remove Tailwind CDN if present (should not be used in production)
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    scripts.forEach((s) => {
      const src = s.getAttribute('src') || '';
      if (src.includes('cdn.tailwindcss.com')) {
        try { s.parentElement?.removeChild(s); } catch (_) {}
        // Tailwind CDN script removed — using bundled CSS
      }
    });
  }, []);

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}