import React, { useEffect, useState } from "react";
import { subscribeStatSync, startStatSync } from "@/lib/statSyncQueue";
import { CheckCircle2, CloudOff, RefreshCw, Loader2 } from "lucide-react";

// Small live indicator so the scorekeeper always knows whether their taps have
// reached the server. Colors: green = all synced, amber = pending/syncing,
// red = offline with unsynced actions.
export default function SyncStatusBadge() {
  const [status, setStatus] = useState({ pending: 0, online: true, flushing: false });

  useEffect(() => {
    startStatSync();
    const unsub = subscribeStatSync(setStatus);
    return () => unsub();
  }, []);

  const { pending, online, flushing } = status;

  let cls, Icon, text;
  if (!online && pending > 0) {
    cls = "bg-red-600 text-white border-red-400";
    Icon = CloudOff;
    text = `Offline — ${pending} pending`;
  } else if (pending > 0) {
    cls = "bg-amber-500 text-white border-amber-300";
    Icon = flushing ? Loader2 : RefreshCw;
    text = `Syncing ${pending}…`;
  } else if (!online) {
    cls = "bg-gray-500 text-white border-gray-300";
    Icon = CloudOff;
    text = "Offline";
  } else {
    cls = "bg-green-600 text-white border-green-400";
    Icon = CheckCircle2;
    text = "All synced";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-black whitespace-nowrap ${cls}`}
      title={online ? "Scores are saved to the server" : "No connection — actions are safely queued and will sync automatically"}
    >
      <Icon className={`w-3.5 h-3.5 ${flushing ? "animate-spin" : ""}`} />
      {text}
    </span>
  );
}