import React from "react";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Crown, Shield, AlertTriangle, CheckCircle } from "lucide-react";

function getStyle(status, tier) {
  // color by status first, then tier accent
  if (status === "expired" || status === "cancelled") {
    return { className: "border-red-300 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30", Icon: AlertTriangle };
  }
  if (status === "active") {
    if (tier === "premium") return { className: "border-amber-300 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30", Icon: Crown };
    if (tier === "basic") return { className: "border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30", Icon: Shield };
    return { className: "border-gray-300 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40", Icon: CheckCircle };
  }
  // trial or default
  return { className: "border-purple-300 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30", Icon: Shield };
}

export default function SubscriptionBadge({ organization }) {
  const tier = organization?.subscription_tier || "free";
  const status = organization?.subscription_status || "trial";
  const sport = organization?.selected_sport;
  const { className, Icon } = getStyle(status, tier);

  const sportLabel = tier === "basic" && sport ? ` • ${sport[0].toUpperCase()}${sport.slice(1)}` : "";

  return (
    <UIBadge variant="outline" className={`px-3 py-1 text-xs font-bold flex items-center gap-1 ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{tier === "free" ? "Free" : tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
      <span>— {status.charAt(0).toUpperCase() + status.slice(1)}</span>
      {sportLabel && <span>{sportLabel}</span>}
    </UIBadge>
  );
}