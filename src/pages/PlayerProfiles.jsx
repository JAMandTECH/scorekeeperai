import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Users, Home as HomeIcon, MessageCircle, UserPlus, Clipboard, LayoutGrid, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import PlayerProfileCard from "@/components/players/PlayerProfileCard";
import PlayerPostCreator from "@/components/players/PlayerPostCreator";
import PlayerPostCard from "@/components/players/PlayerPostCard";
import { usePageSetup } from "@/hooks/usePageSetup";

export default function PlayerProfiles() {
  const { user, organization, isLoading, sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode, handleLogout } = usePageSetup();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profiles");

  // User's own approved profile
  const { data: myProfile } = useQuery({
    queryKey: ["my-player-profile", user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.PlayerProfile.filter({ user_id: user.id, claim_status: "approved" });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  // All profiles in org + their players + teams
  const { data: profilesData, isLoading: profilesLoading } = useQuery({
    queryKey: ["player-profiles", organization?.id],
    queryFn: async () => {
      const profiles = await base44.entities.PlayerProfile.filter({ organization_id: organization.id }, "-created_date");
      const playerIds = [...new Set(profiles.map((p) => p.player_id))];
      const players = playerIds.length > 0 ? await base44.entities.Player.filter({ id: { $in: playerIds } }) : [];
      const teamIds = [...new Set(players.map((p) => p.team_id).filter(Boolean))];
      const teams = teamIds.length > 0 ? await base44.entities.Team.filter({ id: { $in: teamIds } }) : [];
      return { profiles, players, teams };
    },
    enabled: !!organization?.id,
  });

  // Shared feed
  const { data: posts = [], refetch: refetchPosts } = useQuery({
    queryKey: ["player-posts-feed", organization?.id],
    queryFn: async () => {
      const result = await base44.entities.PlayerPost.filter({ organization_id: organization.id }, "-created_date");
      return result;
    },
    enabled: !!organization?.id && activeTab === "feed",
  });

  // Navigation based on role
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

  if (!user || isLoading) {
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
          <div className="w-16 h-16 border border-border flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-3">No Organization Found</h2>
          <p className="text-muted-foreground mb-6 text-sm">Join an organization to browse player profiles.</p>
          <Button onClick={() => navigate(createPageUrl("Home"))}>
            <HomeIcon className="w-4 h-4 mr-2" /> Go Home
          </Button>
        </div>
      </div>
    );
  }

  const profiles = profilesData?.profiles || [];
  const players = profilesData?.players || [];
  const teams = profilesData?.teams || [];
  const getPlayer = (profile) => players.find((p) => p.id === profile.player_id);
  const getTeam = (player) => teams.find((t) => t.id === player?.team_id);

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
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight">Player Profiles</h1>
                  <p className="text-muted-foreground mt-1 text-sm">Browse player profiles and shared updates from {organization.name}</p>
                </div>
                {!myProfile && (
                  <Button onClick={() => navigate(createPageUrl("ClaimPlayer"))}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Claim Your Profile
                  </Button>
                )}
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="profiles">
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Profiles
                  </TabsTrigger>
                  <TabsTrigger value="feed">
                    <Rss className="w-4 h-4 mr-2" />
                    Shared Feed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profiles" className="mt-6">
                  {profilesLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  ) : profiles.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 border border-border flex items-center justify-center mx-auto mb-6">
                        <Users className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-heading text-xl font-bold mb-2">No profiles yet</h3>
                      <p className="text-muted-foreground text-sm mb-6">Be the first to claim your player profile!</p>
                      <Button onClick={() => navigate(createPageUrl("ClaimPlayer"))}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Claim Your Profile
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {profiles.map((profile) => (
                        <PlayerProfileCard
                          key={profile.id}
                          profile={profile}
                          player={getPlayer(profile)}
                          team={getTeam(getPlayer(profile))}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="feed" className="mt-6">
                  <div className="max-w-2xl mx-auto space-y-4">
                    {myProfile ? (
                      <PlayerPostCreator
                        user={user}
                        profile={myProfile}
                        organizationId={organization.id}
                        onPostCreated={() => {
                          refetchPosts();
                          queryClient.invalidateQueries(["player-profiles", organization.id]);
                        }}
                      />
                    ) : (
                      <div className="border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
                        <MessageCircle className="w-5 h-5 mx-auto mb-2" />
                        Claim your profile to start posting.
                        <Button variant="link" onClick={() => navigate(createPageUrl("ClaimPlayer"))}>
                          Claim now
                        </Button>
                      </div>
                    )}
                    {posts.length === 0 ? (
                      <div className="text-center py-16">
                        <p className="text-muted-foreground text-sm">No posts yet. Be the first to share!</p>
                      </div>
                    ) : (
                      posts.map((post) => (
                        <PlayerPostCard
                          key={post.id}
                          post={post}
                          canDelete={user.role === "admin" || post.author_user_id === user.id}
                          onDelete={async () => {
                            await base44.entities.PlayerPost.delete(post.id);
                            refetchPosts();
                          }}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}