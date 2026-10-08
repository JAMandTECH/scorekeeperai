import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Users, Home as HomeIcon, Clipboard, Search, UserCheck, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { usePageSetup } from "@/hooks/usePageSetup";

export default function ClaimPlayer() {
  const { user, organization, isLoading, sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode, handleLogout } = usePageSetup();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [claimPlayer, setClaimPlayer] = useState(null);
  const [reason, setReason] = useState("");

  // Fetch all players in org
  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ["all-players", organization?.id],
    queryFn: async () => {
      return await base44.entities.Player.filter({ organization_id: organization.id });
    },
    enabled: !!organization?.id,
  });

  // Fetch all approved profiles in org (to exclude claimed players)
  const { data: claimedProfiles = [] } = useQuery({
    queryKey: ["claimed-profiles", organization?.id],
    queryFn: async () => {
      return await base44.entities.PlayerProfile.filter({ organization_id: organization.id, claim_status: "approved" });
    },
    enabled: !!organization?.id,
  });

  // Fetch user's pending claims
  const { data: myClaims = [] } = useQuery({
    queryKey: ["my-claims", user?.id],
    queryFn: async () => {
      return await base44.entities.PlayerClaim.filter({ user_id: user.id, status: "pending" });
    },
    enabled: !!user,
  });

  // Fetch teams for display
  const { data: teams = [] } = useQuery({
    queryKey: ["teams-for-claim", organization?.id],
    queryFn: async () => {
      return await base44.entities.Team.filter({ organization_id: organization.id });
    },
    enabled: !!organization?.id,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("claimPlayerRoster", {
        player_id: claimPlayer.id,
        reason,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: "Claim submitted!", description: "An admin will review your request.", duration: 4000 });
      setClaimPlayer(null);
      setReason("");
      queryClient.invalidateQueries(["my-claims", user.id]);
    },
    onError: (err) => {
      toast({ title: "Claim failed", description: err.message, variant: "destructive", duration: 4000 });
    },
  });

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
          <h2 className="font-heading text-2xl font-bold mb-3">No Organization Found</h2>
          <Button onClick={() => navigate(createPageUrl("Home"))}>
            <HomeIcon className="w-4 h-4 mr-2" /> Go Home
          </Button>
        </div>
      </div>
    );
  }

  const claimedPlayerIds = new Set(claimedProfiles.map((p) => p.player_id));
  const pendingClaimPlayerIds = new Set(myClaims.map((c) => c.player_id));
  const getTeam = (player) => teams.find((t) => t.id === player?.team_id);

  const availablePlayers = players.filter((p) => {
    if (claimedPlayerIds.has(p.id)) return false;
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return !search || fullName.includes(search.toLowerCase());
  });

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

              <div>
                <h1 className="font-heading text-3xl font-bold tracking-tight">Claim Your Player Profile</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Find your roster entry and submit a claim. An admin will review and approve it.
                </p>
              </div>

              {myClaims.length > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      <p className="font-heading font-bold text-sm">Pending Claims</p>
                    </div>
                    {myClaims.map((claim) => (
                      <div key={claim.id} className="text-sm text-muted-foreground">
                        {claim.player_name} ({claim.team_name}) — <Badge variant="outline">Pending</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by player name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {playersLoading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : availablePlayers.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-sm">
                    {search ? "No players match your search." : "All players have been claimed."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availablePlayers.slice(0, 50).map((player) => {
                    const team = getTeam(player);
                    const hasPending = pendingClaimPlayerIds.has(player.id);
                    return (
                      <Card key={player.id} className="border-border hover:border-primary/30 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-heading font-bold text-sm">
                              {player.first_name} {player.last_name}
                              {player.jersey_number && <span className="text-muted-foreground ml-2">#{player.jersey_number}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {team?.name || "No team"} {player.position ? `· ${player.position}` : ""}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={hasPending ? "outline" : "default"}
                            disabled={hasPending}
                            onClick={() => {
                              setClaimPlayer(player);
                              setReason("");
                            }}
                          >
                            {hasPending ? "Pending" : "Claim"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {availablePlayers.length > 50 && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      Showing 50 of {availablePlayers.length} players. Refine your search to see more.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Claim Dialog */}
      <Dialog open={!!claimPlayer} onOpenChange={(open) => !open && setClaimPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Profile</DialogTitle>
          </DialogHeader>
          {claimPlayer && (
            <div className="space-y-4 py-2">
              <div className="text-sm">
                <p className="font-heading font-bold">
                  {claimPlayer.first_name} {claimPlayer.last_name}
                </p>
                <p className="text-muted-foreground">
                  {getTeam(claimPlayer)?.name || "No team"} #{claimPlayer.jersey_number}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Why is this your profile?</label>
                <Textarea
                  placeholder="e.g. This is my jersey number and I play for this team..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimPlayer(null)}>
              Cancel
            </Button>
            <Button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}>
              <Send className="w-4 h-4 mr-2" />
              {claimMutation.isPending ? "Submitting..." : "Submit Claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}