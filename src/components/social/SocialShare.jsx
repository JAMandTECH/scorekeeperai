import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Share2, Facebook, Twitter, Instagram, Link as LinkIcon, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SocialShare({ imageUrl, text = 'Check out this poster!', filename = 'poster.png' }) {
  const [sharing, setSharing] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');

  const ensureShareUrl = async () => {
    if (!imageUrl) return '';
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
    if (uploadedUrl) return uploadedUrl;
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type || 'image/png' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadedUrl(file_url);
    return file_url;
  };

  const webShare = async () => {
    try {
      setSharing(true);
      if (imageUrl) {
        try {
          const shareBlob = await fetch(imageUrl).then(r => r.blob());
          const file = new File([shareBlob], filename, { type: shareBlob.type || 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Game Poster', text });
            return;
          }
        } catch (_) {}
      }
      const url = await ensureShareUrl();
      if (navigator.share) {
        await navigator.share({ title: 'Game Poster', text, url });
      } else if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.warn('Share failed', e);
    } finally {
      setSharing(false);
    }
  };

  const openFacebook = async () => {
    setSharing(true);
    try {
      const url = await ensureShareUrl();
      if (url) {
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }
    } finally { setSharing(false); }
  };

  const openTwitter = async () => {
    setSharing(true);
    try {
      const url = await ensureShareUrl();
      if (url) {
        const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }
    } finally { setSharing(false); }
  };

  const shareInstagram = async () => {
    await webShare();
  };

  const copyLink = async () => {
    setSharing(true);
    try {
      const url = await ensureShareUrl();
      if (url) {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard');
      }
    } finally { setSharing(false); }
  };

  const downloadImage = async () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    a.click();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="default" onClick={webShare} disabled={!imageUrl || sharing} className="gap-2">
        {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        Share
      </Button>
      <Button variant="outline" onClick={openFacebook} disabled={!imageUrl || sharing} className="gap-2">
        <Facebook className="h-4 w-4" /> Facebook
      </Button>
      <Button variant="outline" onClick={openTwitter} disabled={!imageUrl || sharing} className="gap-2">
        <Twitter className="h-4 w-4" /> Twitter
      </Button>
      <Button variant="outline" onClick={shareInstagram} disabled={!imageUrl || sharing} className="gap-2">
        <Instagram className="h-4 w-4" /> Instagram
      </Button>
      <Button variant="ghost" onClick={copyLink} disabled={!imageUrl || sharing} className="gap-2">
        <LinkIcon className="h-4 w-4" /> Copy link
      </Button>
      <Button variant="ghost" onClick={downloadImage} disabled={!imageUrl} className="gap-2">
        <Download className="h-4 w-4" /> Download
      </Button>
    </div>
  );
}