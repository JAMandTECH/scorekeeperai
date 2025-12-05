import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LiveStreamEmbed({ streamUrl, gameTitle }) {
  if (!streamUrl) return null;

  // Convert various stream URLs to embeddable format
  const getEmbedUrl = (url) => {
    try {
      // YouTube Live
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // Handle various YouTube URL formats
        let videoId = null;
        
        if (url.includes('youtube.com/watch')) {
          const urlParams = new URLSearchParams(new URL(url).search);
          videoId = urlParams.get('v');
        } else if (url.includes('youtube.com/live/')) {
          videoId = url.split('youtube.com/live/')[1]?.split('?')[0];
        } else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1]?.split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
          return url; // Already an embed URL
        }
        
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }
      }
      
      // Twitch
      if (url.includes('twitch.tv')) {
        const channel = url.split('twitch.tv/')[1]?.split('/')[0]?.split('?')[0];
        if (channel) {
          return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
        }
      }
      
      // Facebook Live
      if (url.includes('facebook.com') && url.includes('/videos/')) {
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
      }
      
      // If it's already an embed URL or direct video, return as is
      if (url.includes('/embed') || url.endsWith('.m3u8') || url.endsWith('.mp4')) {
        return url;
      }
      
      // Return original URL if we can't convert it
      return url;
    } catch (error) {
      console.error('Error parsing stream URL:', error);
      return url;
    }
  };

  const embedUrl = getEmbedUrl(streamUrl);
  const isEmbeddable = embedUrl.includes('embed') || embedUrl.includes('player.twitch.tv') || embedUrl.includes('facebook.com/plugins');

  return (
    <Card className="bg-gray-900 border-2 border-red-500/50 shadow-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-red-600 to-pink-600 py-3 px-4">
        <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
          <Video className="w-5 h-5 animate-pulse" />
          Live Stream {gameTitle && `- ${gameTitle}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isEmbeddable ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={embedUrl}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={`Live Stream - ${gameTitle || 'Game'}`}
            />
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-400 mb-4">Stream available at external link:</p>
            <Button
              onClick={() => window.open(streamUrl, '_blank')}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Live Stream
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}