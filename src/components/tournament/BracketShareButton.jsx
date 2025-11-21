import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Facebook, Twitter, Instagram, Users, Check, Link2, Copy } from "lucide-react";
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

export default function BracketShareButton({ tournament, user, organizationId }) {
  const [shared, setShared] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [bracketType, setBracketType] = useState(tournament?.is_manual_bracket ? "manual" : "auto");
  const [bracketImage, setBracketImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleOpenUploadDialog = () => {
    setShowUploadDialog(true);
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBracketImage(file_url);
      setShowUploadDialog(false);
      setShowShareDialog(true);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    }
    setIsUploading(false);
  };

  const downloadBracket = () => {
    if (!bracketImage) return;
    const link = document.createElement('a');
    link.href = bracketImage;
    link.download = `${tournament.name}-bracket.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareToOrganizationFeed = async () => {
    const bracketTypeLabel = bracketType === "auto" ? "Automatic" : "Manual";
    const content = `🏆 ${tournament.name} - ${tournament.sport.toUpperCase()} Tournament Bracket (${bracketTypeLabel} Builder) is live! Check out the tournament featuring ${tournament.num_teams} teams competing for the championship. #${tournament.sport} #tournament`;
    
    await base44.entities.SocialPost.create({
      organization_id: organizationId,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      content: content,
      media_urls: bracketImage ? [bracketImage] : [],
      media_types: bracketImage ? ['image'] : [],
      likes_count: 0,
      comments_count: 0
    });

    queryClient.invalidateQueries(['social-posts']);
    setShared(true);
    setShowShareDialog(false);
    setBracketImage(null);
    setTimeout(() => setShared(false), 2000);
  };

  const shareToSocialMedia = (platform) => {
    if (!bracketImage) return;
    
    const bracketTypeLabel = bracketType === "auto" ? "Automatic" : "Manual";
    const text = encodeURIComponent(`🏆 ${tournament.name} - ${tournament.sport.toUpperCase()} Tournament (${bracketTypeLabel} Bracket) featuring ${tournament.num_teams} teams!`);
    
    switch(platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bracketImage)}`, '_blank');
        break;
      case 'twitter':
        navigator.clipboard.writeText(`${text} ${bracketImage}`);
        alert("Bracket text and image link copied! Paste in Twitter/X to share.");
        break;
      case 'instagram':
        downloadBracket();
        alert("Bracket image downloaded! Upload it to Instagram from your device.");
        break;
    }
  };

  return (
    <>
      <Button 
        onClick={handleOpenUploadDialog} 
        variant="outline" 
        className="font-bold"
      >
        {shared ? (
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

      {/* Upload Screenshot Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Upload Bracket Screenshot</DialogTitle>
            <DialogDescription>
              Take a screenshot of the bracket below and upload it to share
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2">📸 How to Screenshot:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• <strong>Windows:</strong> Press Windows + Shift + S</li>
                <li>• <strong>Mac:</strong> Press Cmd + Shift + 4</li>
                <li>• <strong>Mobile:</strong> Use device screenshot function</li>
              </ul>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="bracket-upload"
                disabled={isUploading}
              />
              <label htmlFor="bracket-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center">
                    <Share2 className="w-8 h-8 text-white" />
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {isUploading ? "Uploading..." : "Click to Upload Screenshot"}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    PNG, JPG, or other image formats
                  </div>
                </div>
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Share Tournament Bracket</DialogTitle>
            <DialogDescription>
              Share the {tournament.name} bracket with your audience
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Bracket Image Preview */}
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
                disabled={!bracketImage}
              >
                <Users className="w-4 h-4 mr-2" />
                Share to Organization Feed
              </Button>

              <div className="grid grid-cols-3 gap-3">
                <Button 
                  onClick={() => shareToSocialMedia('facebook')} 
                  variant="outline"
                  className="w-full"
                  disabled={!bracketImage}
                >
                  <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                  Facebook
                </Button>
                <Button 
                  onClick={() => shareToSocialMedia('twitter')} 
                  variant="outline"
                  className="w-full"
                  disabled={!bracketImage}
                >
                  <Twitter className="w-4 h-4 mr-2 text-sky-500" />
                  X
                </Button>
                <Button 
                  onClick={() => shareToSocialMedia('instagram')} 
                  variant="outline"
                  className="w-full"
                  disabled={!bracketImage}
                >
                  <Instagram className="w-4 h-4 mr-2 text-pink-600" />
                  Instagram
                </Button>
              </div>

              <Button 
                onClick={() => {
                  setShowShareDialog(false);
                  setShowUploadDialog(true);
                }} 
                variant="outline"
                className="w-full justify-start"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Upload Different Screenshot
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}