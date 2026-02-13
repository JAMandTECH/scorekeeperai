import React from "react";
import "./globals.css";

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}