import React from "react";
import { Button } from "@/components/ui/button";

export default function StatButton({ label, onClick, variant = "default", className = "" }) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      className={`h-14 px-5 text-base md:h-16 md:text-lg rounded-xl active:scale-95 transition-transform ${className}`}
    >
      {label}
    </Button>
  );
}