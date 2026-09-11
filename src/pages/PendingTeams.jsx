import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function PendingTeams() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("PendingTeams"));
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
    },
    enabled: !!user?.organization_id,
  });

  const { data: pendingTeams = [] } = useQuery({
    queryKey: ['pending-teams', user?.organization_id],
    queryFn: async () => {
      const teams = await base44.entities.Team.filter({ 
        organization_id: user?.organization_id,
        status: 'pending'
      });
      return teams;
    },
    enabled: !!user?.organization_id,
    refetchInterval: 10000,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players'],
    queryFn: () => base44.entities.Player.list(),
    enabled: true,
    refetchInterval: 15000,
  });

  const approveTeamMutation = useMutation({
    mutationFn: async (teamId) => {
      const teams = await base44.entities.Team.list();
      const team = teams.find(t => t.id === teamId);
      
      await base44.entities.Team.update(teamId, { status: 'approved' });
      
      // Send email notification to team submitter
      if (team?.submitted_by) {
        await base44.integrations.Core.SendEmail({
          to: team.submitted_by,
          subject: `Team Approved: ${team.name}`,
          body: `
            <h2>Team Registration Approved!</h2>
            <p>Your team registration has been approved:</p>
            <ul>
              <li><strong>Team Name:</strong> ${team.name}</li>
              <li><strong>Sport:</strong> ${team.sport}</li>
              <li><strong>Division:</strong> ${team.division}</li>
            </ul>
            <p>Your team is now active and can participate in games.</p>
          `
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-teams']);
      queryClient.invalidateQueries(['teams']);
      queryClient.invalidateQueries(['all-teams']);
    },
  });

  const rejectTeamMutation = useMutation({
    mutationFn: async (teamId) => {
      const teams = await base44.entities.Team.list();
      const team = teams.find(t => t.id === teamId);
      
      await base44.entities.Team.update(teamId, { status: 'rejected' });
      
      // Send email notification to team submitter
      if (team?.submitted_by) {
        await base44.integrations.Core.SendEmail({
          to: team.submitted_by,
          subject: `Team Registration Update: ${team.name}`,
          body: `
            <h2>Team Registration Status Update</h2>
            <p>Your team registration was not approved:</p>
            <ul>
              <li><strong>Team Name:</strong> ${team.name}</li>
              <li><strong>Sport:</strong> ${team.sport}</li>
              <li><strong>Division:</strong> ${team.division}</li>
            </ul>
            <p>Please contact the organization administrator for more details.</p>
          `
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-teams']);
      queryClient.invalidateQueries(['teams']);
    },
  });

  const getTeamPlayers = (teamId) => {
    return allPlayers.filter(p => p.team_id === teamId);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <div>
                <h1 className="font-heading text-3xl font-bold tracking-tight">Pending Team Approvals</h1>
                <p className="text-muted-foreground mt-2 font-medium">
                   Review and approve team registrations ({pendingTeams.length} pending)
                 </p>
                </div>

                {pendingTeams.length === 0 ? (
                <Card>
                   <CardContent className="p-12 text-center">
                    <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-xl font-heading font-bold text-muted-foreground">No pending team approvals</p>
                    <p className="text-sm text-muted-foreground mt-2">All team registrations have been processed</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {pendingTeams.map(team => {
                    const teamPlayers = getTeamPlayers(team.id);
                    const sportColor = team.sport === 'basketball' ? 'orange' : 'blue';
                    
                    return (
                      <Card key={team.id}>
                        <CardHeader className="border-b border-border">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-16 h-16 border border-border">
                                <AvatarImage src={team.logo_url} />
                                <AvatarFallback className="bg-secondary text-foreground font-heading font-bold">
                                  {team.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-2xl font-heading font-bold">
                                  {team.name}
                                </CardTitle>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline" className="border-border text-muted-foreground font-medium uppercase">
                                    {team.sport}
                                  </Badge>
                                  {team.division && (
                                    <Badge variant="outline" className="font-medium">
                                      {team.division}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="border-foreground/60 text-foreground font-medium">
                                    <Clock className="w-3 h-3 mr-1" />
                                    PENDING
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => approveTeamMutation.mutate(team.id)}
                                disabled={approveTeamMutation.isLoading}
                                className="font-medium"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => rejectTeamMutation.mutate(team.id)}
                                disabled={rejectTeamMutation.isLoading}
                                variant="outline"
                                className="border-destructive/30 text-destructive hover:bg-destructive/10 font-medium"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Team Info */}
                            <div>
                              <h3 className="text-lg font-heading font-bold text-foreground mb-3">Team Information</h3>
                              <div className="space-y-2 text-sm">
                                {team.coach_name && (
                                  <p className="text-foreground">
                                    <span className="font-heading font-bold">Coach:</span> {team.coach_name}
                                  </p>
                                )}
                                {team.coach_contact && (
                                  <p className="text-foreground">
                                    <span className="font-heading font-bold">Contact:</span> {team.coach_contact}
                                  </p>
                                )}
                                <p className="text-foreground">
                                  <span className="font-heading font-bold">Submitted by:</span> {team.submitted_by}
                                </p>
                                <p className="text-foreground">
                                  <span className="font-heading font-bold">Created:</span> {new Date(team.created_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {/* Player Roster */}
                            <div>
                              <h3 className="text-lg font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Player Roster ({teamPlayers.length})
                              </h3>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {teamPlayers.map(player => (
                                  <div key={player.id} className="bg-muted p-3 border border-border">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-heading font-bold text-foreground text-sm">
                                          #{player.jersey_number} {player.first_name} {player.last_name}
                                        </p>
                                        {player.position && (
                                          <p className="text-xs text-muted-foreground">{player.position}</p>
                                        )}
                                      </div>
                                      {player.contact_number && (
                                        <p className="text-xs text-muted-foreground">{player.contact_number}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {teamPlayers.length === 0 && (
                                  <p className="text-sm text-muted-foreground italic">No players registered</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}