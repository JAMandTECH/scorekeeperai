import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Radio, Copy, Check, ExternalLink } from "lucide-react";

export default function BroadcastOverlayDialog({ open, onOpenChange, game }) {
  const [copied, setCopied] = useState(false);

  if (!game) return null;

  // Build the overlay URL — uses the published app domain
  const origin = window.location.origin;
  const overlayUrl = `${origin}/overlay/${game.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = overlayUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-900 border-2 border-purple-500 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white text-xl font-black flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-500" />
            Broadcast Overlay URL
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
            Add this URL as a Browser Source in OBS or vMix to overlay the live scoreboard on your stream.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL display + copy */}
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={overlayUrl}
              onClick={(e) => e.target.select()}
              className="flex-1 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white font-mono"
            />
            <Button
              onClick={handleCopy}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold"
            >
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          {/* OBS setup instructions */}
          <div className="rounded-xl border-2 border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/30 p-4 space-y-2">
            <h4 className="font-bold text-purple-900 dark:text-purple-200 text-sm flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              OBS Setup Instructions
            </h4>
            <ol className="text-sm text-purple-800 dark:text-purple-300 space-y-1.5 list-decimal list-inside font-medium">
              <li>In OBS, click <span className="font-bold">+ </span>under Sources → <span className="font-bold">Browser</span></li>
              <li>Check "Local file" is <span className="font-bold">unchecked</span>, paste the URL above</li>
              <li>Set width: <span className="font-bold">1920</span>, height: <span className="font-bold">1080</span></li>
              <li>The overlay has a transparent background — it will key over your video automatically</li>
              <li>The scoreboard updates in real-time as the scorekeeper records the game</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => window.open(overlayUrl, "_blank")}
              variant="outline"
              className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-bold"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview Overlay
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-bold"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}