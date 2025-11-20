import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Facebook, Twitter, Instagram, Users, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function BracketShareButton({ tournament, user, organizationId }) {
  const [shared, setShared] = useState(false);
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

  const shareToOrganizationFeed = () => {
    shareToSocialFeedMutation.mutate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="font-bold">
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={shareToOrganizationFeed} className="cursor-pointer">
          <Users className="w-4 h-4 mr-2 text-blue-600" />
          Share to Organization Feed
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={shareToFacebook} className="cursor-pointer">
          <Facebook className="w-4 h-4 mr-2 text-blue-600" />
          Share to Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTwitter} className="cursor-pointer">
          <Twitter className="w-4 h-4 mr-2 text-sky-500" />
          Share to X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToInstagram} className="cursor-pointer">
          <Instagram className="w-4 h-4 mr-2 text-pink-600" />
          Share to Instagram
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}