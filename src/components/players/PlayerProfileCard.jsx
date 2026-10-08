import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Globe, Building2 } from "lucide-react";

const visIcon = {
  private: Lock,
  organization: Building2,
  public: Globe,
};

export default function PlayerProfileCard({ profile, player, team }) {
  const displayName = player ? `${player.first_name} ${player.last_name}` : profile?.user_name || "Player";
  const initials = displayName?.charAt(0)?.toUpperCase() || "P";
  const VisIcon = visIcon[profile?.visibility] || Lock;

  return (
    <Link to={`/PlayerProfileView?profile_id=${profile.id}`} className="block group">
      <Card className="border-border hover:border-primary transition-colors overflow-hidden h-full">
        <div className="h-16 bg-gradient-to-br from-primary/10 to-muted" />
        <CardContent className="p-4 -mt-8">
          <div className="w-16 h-16 rounded-full border-4 border-card bg-card overflow-hidden flex items-center justify-center mb-3">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt={displayName} className="w-full h-full object-cover" />
            ) : player?.photo_url ? (
              <img src={player.photo_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-heading font-bold text-muted-foreground">{initials}</span>
            )}
          </div>
          <h3 className="font-heading font-bold text-sm truncate group-hover:text-primary transition-colors">
            {displayName}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {team && <span className="truncate">{team.name}</span>}
            {player?.jersey_number && <span>#{player.jersey_number}</span>}
          </div>
          {profile?.bio && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{profile.bio}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              <VisIcon className="w-3 h-3 mr-1" />
              {profile.visibility}
            </Badge>
            <span className="text-xs text-muted-foreground">{profile.followers_count || 0} followers</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}