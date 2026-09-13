import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Facebook,
  Twitter,
  MessageCircle,
  Link as LinkIcon,
  Check,
} from "lucide-react";

/**
 * Share bar for the public game view (scoreboard + live stream).
 * Shares the current page URL to social platforms or copies the link.
 */
export default function ShareGameBar({ url, title = "Watch live on ScorekeeperAI" }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  const open = (target) => window.open(target, "_blank", "noopener,noreferrer");

  const shareFacebook = () =>
    open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);

  const shareTwitter = () =>
    open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`
    );

  const shareWhatsApp = () =>
    open(`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url: shareUrl });
      } catch (_) {}
    } else {
      copyLink();
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="default" size="sm" onClick={nativeShare} className="gap-1.5">
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>
      <Button variant="outline" size="icon" onClick={shareFacebook} aria-label="Share on Facebook" className="h-8 w-8">
        <Facebook className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={shareTwitter} aria-label="Share on X" className="h-8 w-8">
        <Twitter className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={shareWhatsApp} aria-label="Share on WhatsApp" className="h-8 w-8">
        <MessageCircle className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5">
        {copied ? <Check className="w-4 h-4 text-primary" /> : <LinkIcon className="w-4 h-4" />}
        <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
      </Button>
    </div>
  );
}