import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Facebook, Twitter, Instagram, Users, Check, Download, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import html2canvas from "html2canvas";

export default function BracketShareButton({ tournament, user, organizationId }) {
  const [shared, setShared] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [bracketType, setBracketType] = useState("auto");
  const [bracketImage, setBracketImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const queryClient = useQueryClient();

  const shareToSocialFeedMutation = useMutation({
    mutationFn: async () => {
      const content = `🏆 ${tournament.name} - ${tournament.sport.toUpperCase()} Tournament Bracket is live! Check out the tournament featuring ${tournament.num_teams} teams competing for the championship. #${tournament.sport} #tournament`;
      
      await base44.entities.SocialPost.create({
        organization_id: organizationId,
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        content: content,
        media_urls: [],
        media_types: [],
        likes_count: 0,
        comments_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['social-posts']);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    },
  });

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`${tournament.name} - Tournament Bracket`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`🏆 ${tournament.name} - ${tournament.sport.toUpperCase()} Tournament featuring ${tournament.num_teams} teams! Check out the bracket:`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToInstagram = () => {
    // Instagram doesn't have a direct share URL, so we copy the link
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied! Open Instagram and paste the link in your story or post.");
  };

  const captureBracket = async () => {
    setIsCapturing(true);
    try {
      // Find the bracket visual element
      const bracketElement = document.querySelector('.bracket-visual-container');
      if (!bracketElement) {
        alert("Could not find bracket to capture. Please try again.");
        setIsCapturing(false);
        return;
      }

      // Capture the bracket as an image
      const canvas = await html2canvas(bracketElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert("Failed to capture bracket. Please try again.");
          setIsCapturing(false);
          return;
        }

        // Upload the image
        const file = new File([blob], `bracket-${tournament.name}.png`, { type: 'image/png' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        setBracketImage(file_url);
        setIsCapturing(false);
        setShowShareDialog(true);
      }, 'image/png');
    } catch (error) {
      console.error("Error capturing bracket:", error);
      alert("Failed to capture bracket. Please try again.");
      setIsCapturing(false);
    }
  };

  const downloadBracket = async () => {
    if (!bracketImage) return;
    
    // Download the image
    const link = document.createElement('a');
    link.href = bracketImage;
    link.download = `${tournament.name}-bracket.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareToOrganizationFeed = async () => {
    if (!bracketImage) return;

    const bracketTypeLabel = bracketType === "auto" ? "Automatic" : "Manual";
    const content = `🏆 ${tournament.name} - ${tournament.sport.toUpperCase()} Tournament Bracket (${bracketTypeLabel} Builder) is live! Check out the tournament featuring ${tournament.num_teams} teams competing for the championship. #${tournament.sport} #tournament`;
    
    await base44.entities.SocialPost.create({
      organization_id: organizationId,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      content: content,
      media_urls: [bracketImage],
      media_types: ['image'],
      likes_count: 0,
      comments_count: 0
    });

    queryClient.invalidateQueries(['social-posts']);
    setShared(true);
    setShowShareDialog(false);
    setTimeout(() => setShared(false), 2000);
  };

  const shareToSocialMedia = (platform) => {
    if (!bracketImage) return;

    const bracketTypeLabel = bracketType === "auto" ? "Automatic" : "Manual";
    const text = `🏆 ${tournament.name} - ${tournament.sport.toUpperCase()} Tournament (${bracketTypeLabel} Bracket) featuring ${tournament.num_teams} teams!`;
    
    switch(platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bracketImage)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(bracketImage)}`, '_blank');
        break;
      case 'instagram':
        navigator.clipboard.writeText(bracketImage);
        alert("Bracket image link copied! Open Instagram and paste the link in your story or post.");
        break;
    }
  };

  return (
    <>
      <Button 
        onClick={captureBracket} 
        variant="outline" 
        className="font-bold"
        disabled={isCapturing}
      >
        {isCapturing ? (
          <>
            <Camera className="w-4 h-4 mr-2 animate-pulse" />
            Capturing...
          </>
        ) : shared ? (
          <>
            <Check className="w-4 h-4 mr-2 text-green-600" />
            Shared!
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4 mr-2" />
            Share Bracket
          </>
        )}
      </Button>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Share Tournament Bracket</DialogTitle>
            <DialogDescription>
              Choose bracket type and share options
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Bracket Preview */}
            {bracketImage && (
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <img 
                  src={bracketImage} 
                  alt="Bracket Preview" 
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Bracket Type Selection */}
            <div>
              <Label className="text-base font-bold mb-3 block">Bracket Type</Label>
              <RadioGroup value={bracketType} onValueChange={setBracketType}>
                <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-colors">
                  <RadioGroupItem value="auto" id="auto" />
                  <Label htmlFor="auto" className="flex-1 cursor-pointer font-medium">
                    <div>
                      <div className="font-bold">Automatic Builder</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Standard seeded tournament bracket</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-colors">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="flex-1 cursor-pointer font-medium">
                    <div>
                      <div className="font-bold">Manual Builder</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Custom designed bracket layout</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Share Options */}
            <div className="space-y-3">
              <Label className="text-base font-bold">Share To</Label>
              
              <Button 
                onClick={shareToOrganizationFeed} 
                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
              >
                <Users className="w-4 h-4 mr-2" />
                Share to Organization Feed
              </Button>

              <div className="grid grid-cols-3 gap-3">
                <Button 
                  onClick={() => shareToSocialMedia('facebook')} 
                  variant="outline"
                  className="w-full"
                >
                  <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                  Facebook
                </Button>
                <Button 
                  onClick={() => shareToSocialMedia('twitter')} 
                  variant="outline"
                  className="w-full"
                >
                  <Twitter className="w-4 h-4 mr-2 text-sky-500" />
                  X
                </Button>
                <Button 
                  onClick={() => shareToSocialMedia('instagram')} 
                  variant="outline"
                  className="w-full"
                >
                  <Instagram className="w-4 h-4 mr-2 text-pink-600" />
                  Instagram
                </Button>
              </div>

              <Button 
                onClick={downloadBracket} 
                variant="outline"
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Bracket Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}