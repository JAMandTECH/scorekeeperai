import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Users, Home as HomeIcon, Clipboard, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import PlayerProfileHeader from "@/components/players/PlayerProfileHeader";
import PlayerPostCreator from "@/components/players/PlayerPostCreator";
import PlayerPostCard from "@/components/players/PlayerPostCard";
import { usePageSetup } from "@/hooks/usePageSetup";

export default function PlayerProfileView() {
  const { user, organization, isLoading, sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode, handleLogout } = usePageSetup();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profileId = searchParams.get("profile_id");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editVisibility, setEditVisibility] = useState("private");

  // Fetch the profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["player-profile", profileId],
    queryFn: async () => {
      return await base44.entities.PlayerProfile.get(profileId);
    },
    enabled: !!profileId,
  });

  // Fetch the player record
  const { data: player } = useQuery({
    queryKey: ["player-for-profile", profile?.player_id],
    queryFn: async () => {
      return await base44.entities.Player.get(profile.player_id);
    },
    enabled: !!profile?.player_id,
  });

  // Fetch the team
  const { data: team } = useQuery({
    queryKey: ["team-for-player", player?.team_id],
    queryFn: async () => {
      return await base44.entities.Team.get(player.team_id);
    },
    enabled: !!player?.team_id,
  });

  // Fetch posts for this profile
  const { data: posts = [], refetch: refetchPosts } = useQuery({
    queryKey: ["player-profile-posts", profileId],
    queryFn: async () => {
      return await base44.entities.PlayerPost.filter({ profile_id: profileId }, "-created_date");
    },
    enabled: !!profileId,
  });

  // Check if current user follows this profile
  const { data: followRecord } = useQuery({
    queryKey: ["player-follow", user?.id, profileId],
    queryFn: async () => {
      const follows = await base44.entities.PlayerFollow.filter({
        follower_user_id: user.id,
        followed_profile_id: profileId,
      });
      return follows[0] || null;
    },
    enabled: !!user && !!profileId && profile?.user_id !== user.id,
  });

  // Fetch follower count
  const { data: followersCount = 0 } = useQuery({
    queryKey: ["player-followers-count", profileId],
    queryFn: async () => {
      return await base44.entities.PlayerFollow.count({ followed_profile_id: profileId });
    },
    enabled: !!profileId,
  });

  const isOwner = !!user && !!profile && profile.user_id === user.id;
  const isFollowing = !!followRecord;

  // Navigation
  let navigationItems = null;
  if (user?.is_scorekeeper && user?.role !== "admin") {
    navigationItems = [
      { title: "Organization Home", url: createPageUrl("Home"), icon: HomeIcon },
      { title: "My Games", url: createPageUrl("ScorekeeperDashboard"), icon: Clipboard },
      { title: "Player Profiles", url: createPageUrl("PlayerProfiles"), icon: Users },
    ];
  } else if (user?.role !== "admin" && !user?.role_id) {
    navigationItems = [
      { title: "Organization Home", url: createPageUrl("Home"), icon: HomeIcon },
      { title: "Player Profiles", url: createPageUrl("PlayerProfiles"), icon: Users },
    ];
  }

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await base44.entities.PlayerFollow.delete(followRecord.id);
        await base44.entities.PlayerProfile.update(profile.id, {
          followers_count: Math.max(0, (profile.followers_count || 0) - 1),
        });
      } else {
        await base44.entities.PlayerFollow.create({
          organization_id: organization.id,
          follower_user_id: user.id,
          followed_player_id: profile.player_id,
          followed_profile_id: profile.id,
        });
        await base44.entities.PlayerProfile.update(profile.id, {
          followers_count: (profile.followers_count || 0) + 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["player-follow", user.id, profileId]);
      queryClient.invalidateQueries(["player-followers-count", profileId]);
      queryClient.invalidateQueries(["player-profile", profileId]);
    },
  });

  const handleEditOpen = () => {
    setEditBio(profile?.bio || "");
    setEditVisibility(profile?.visibility || "private");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    try {
      await base44.entities.PlayerProfile.update(profile.id, {
        bio: editBio,
        visibility: editVisibility,
      });
      setEditOpen(false);
      queryClient.invalidateQueries(["player-profile", profileId]);
      toast({ title: "Profile updated", duration: 2000 });
    } catch (err) {
      toast({ title: "Update failed", variant: "destructive", duration: 3000 });
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard", duration: 2000 });
  };

  if (!user || isLoading || profileLoading) {
    return (
      <div className="arena-command min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="arena-command min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="font-heading text-2xl font-bold mb-3">No Organization Found</h2>
          <Button onClick={() => navigate(createPageUrl("Home"))}>
            <HomeIcon className="w-4 h-4 mr-2" /> Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="arena-command min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 border border-border flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-3">Profile Not Found</h2>
          <p className="text-muted-foreground mb-6 text-sm">This profile may be private or doesn't exist.</p>
          <Button onClick={() => navigate(createPageUrl("PlayerProfiles"))}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Profiles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="arena-command min-h-screen bg-background text-foreground">
      <AdminHeader
        user={user}
        organization={organization}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <div className="flex">
        <AdminSidebar
          user={user}
          organization={organization}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
          navigationItems={navigationItems}
        />
        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("PlayerProfiles"))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profiles
              </Button>

              <PlayerProfileHeader
                profile={profile}
                player={player}
                team={team}
                isOwner={isOwner}
                isFollowing={isFollowing}
                followersCount={followersCount}
                postsCount={profile.posts_count || posts.length}
                onFollowToggle={() => followMutation.mutate()}
                onEdit={handleEditOpen}
                onShare={handleShare}
              />

              {/* Posts section */}
              <div className="space-y-4">
                <h2 className="font-heading text-lg font-bold">
                  {isOwner ? "Your Posts" : "Posts"}
                </h2>
                {isOwner && (
                  <PlayerPostCreator
                    user={user}
                    profile={profile}
                    organizationId={organization.id}
                    onPostCreated={() => {
                      refetchPosts();
                      queryClient.invalidateQueries(["player-profile", profileId]);
                      queryClient.invalidateQueries(["player-posts-feed", organization.id]);
                    }}
                  />
                )}
                {posts.length === 0 ? (
                  <div className="text-center py-12 border border-border rounded-lg">
                    <p className="text-muted-foreground text-sm">No posts yet.</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PlayerPostCard
                      key={post.id}
                      post={post}
                      canDelete={isOwner || user.role === "admin"}
                      onDelete={async () => {
                        await base44.entities.PlayerPost.delete(post.id);
                        await base44.entities.PlayerProfile.update(profile.id, {
                          posts_count: Math.max(0, (profile.posts_count || 1) - 1),
                        });
                        refetchPosts();
                        queryClient.invalidateQueries(["player-profile", profileId]);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <Textarea
                placeholder="Tell fans about yourself..."
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile Visibility</label>
              <Select value={editVisibility} onValueChange={setEditVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (only you)</SelectItem>
                  <SelectItem value="organization">Organization (league members)</SelectItem>
                  <SelectItem value="public">Public (anyone with link)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Team identity and season stats are always league-verified.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}