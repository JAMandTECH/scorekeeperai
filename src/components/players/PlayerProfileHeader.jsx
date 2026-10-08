import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, UserCheck, Pencil, Lock, Globe, Building2, Share2, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const visibilityConfig = {
  private: { label: "Private", icon: Lock, className: "bg-muted text-muted-foreground" },
  organization: { label: "Org Only", icon: Building2, className: "bg-primary/10 text-primary" },
  public: { label: "Public", icon: Globe, className: "bg-primary text-primary-foreground" },
};

export default function PlayerProfileHeader({
  profile,
  player,
  team,
  isOwner,
  isFollowing,
  followersCount,
  postsCount,
  onFollowToggle,
  onEdit,
  onShare,
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const vis = visibilityConfig[profile?.visibility] || visibilityConfig.private;
  const VisIcon = vis.icon;

  const displayName = player ? `${player.first_name} ${player.last_name}` : profile?.user_name || "Unknown Player";
  const initials = displayName?.charAt(0)?.toUpperCase() || "P";

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPrivateFile({ file });
      await base44.entities.PlayerProfile.update(profile.id, { photo_url: file_url });
      toast({ title: "Photo updated", duration: 2000 });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive", duration: 3000 });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-border">
      {profile?.cover_photo_url ? (
        <div className="h-32 bg-muted relative">
          <img src={profile.cover_photo_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-20 bg-gradient-to-br from-primary/10 to-muted" />
      )}

      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-6 -mt-16 sm:-mt-12">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-28 h-28 rounded-full border-4 border-card bg-card overflow-hidden flex items-center justify-center">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt={displayName} className="w-full h-full object-cover" />
              ) : player?.photo_url ? (
                <img src={player.photo_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-heading font-bold text-muted-foreground">{initials}</span>
              )}
            </div>
            {isOwner && (
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            )}
          </div>

          {/* Identity + actions */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-heading text-2xl font-bold tracking-tight">{displayName}</h1>
                <Badge className={vis.className}>
                  <VisIcon className="w-3 h-3 mr-1" />
                  {vis.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                {team && <span className="font-medium text-foreground">{team.name}</span>}
                {player?.jersey_number && <span>#{player.jersey_number}</span>}
                {player?.position && <span>{player.position}</span>}
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{followersCount}</strong> Followers
                </span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{postsCount}</strong> Posts
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {isOwner ? (
                <Button onClick={onEdit} variant="outline" size="sm">
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <Button onClick={onFollowToggle} variant={isFollowing ? "outline" : "default"} size="sm">
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              )}
              <Button onClick={onShare} variant="ghost" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <p className="mt-6 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        )}

        {/* Stats row — league-verified */}
        {player && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Season Stats <span className="text-primary">League Verified</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatBlock label="Points" value={player.total_points || 0} />
              <StatBlock label="Rebounds" value={player.total_rebounds || 0} />
              <StatBlock label="Assists" value={player.total_assists || 0} />
              <StatBlock label="Games" value={player.games_played || 0} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="text-center sm:text-left">
      <p className="font-heading text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}