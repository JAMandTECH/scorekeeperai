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
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === user?.organization_id);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50/30 to-gray-50 dark:from-gray-900 dark:via-yellow-950/10 dark:to-gray-900">
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
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">Pending Team Approvals</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Review and approve team registrations ({pendingTeams.length} pending)
                </p>
              </div>

              {pendingTeams.length === 0 ? (
                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardContent className="p-12 text-center">
                    <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-xl font-bold text-gray-500 dark:text-gray-400">No pending team approvals</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">All team registrations have been processed</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {pendingTeams.map(team => {
                    const teamPlayers = getTeamPlayers(team.id);
                    const sportColor = team.sport === 'basketball' ? 'orange' : 'blue';
                    
                    return (
                      <Card key={team.id} className={`bg-white dark:bg-gray-800 border-2 border-${sportColor}-200 dark:border-${sportColor}-800 shadow-lg`}>
                        <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-16 h-16 border-2 border-gray-200 dark:border-gray-700 shadow-md">
                                <AvatarImage src={team.logo_url} />
                                <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white font-black`}>
                                  {team.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
                                  {team.name}
                                </CardTitle>
                                <div className="flex gap-2 mt-2">
                                  <Badge className={`bg-${sportColor}-100 text-${sportColor}-700 dark:bg-${sportColor}-950 dark:text-${sportColor}-300 font-bold`}>
                                    {team.sport}
                                  </Badge>
                                  {team.division && (
                                    <Badge variant="outline" className="font-semibold">
                                      {team.division}
                                    </Badge>
                                  )}
                                  <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 font-bold">
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
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => rejectTeamMutation.mutate(team.id)}
                                disabled={rejectTeamMutation.isLoading}
                                variant="outline"
                                className="border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold"
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
                              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3">Team Information</h3>
                              <div className="space-y-2 text-sm">
                                {team.coach_name && (
                                  <p className="text-gray-700 dark:text-gray-300">
                                    <span className="font-bold">Coach:</span> {team.coach_name}
                                  </p>
                                )}
                                {team.coach_contact && (
                                  <p className="text-gray-700 dark:text-gray-300">
                                    <span className="font-bold">Contact:</span> {team.coach_contact}
                                  </p>
                                )}
                                <p className="text-gray-700 dark:text-gray-300">
                                  <span className="font-bold">Submitted by:</span> {team.submitted_by}
                                </p>
                                <p className="text-gray-700 dark:text-gray-300">
                                  <span className="font-bold">Created:</span> {new Date(team.created_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {/* Player Roster */}
                            <div>
                              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Player Roster ({teamPlayers.length})
                              </h3>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {teamPlayers.map(player => (
                                  <div key={player.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                                          #{player.jersey_number} {player.first_name} {player.last_name}
                                        </p>
                                        {player.position && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400">{player.position}</p>
                                        )}
                                      </div>
                                      {player.contact_number && (
                                        <p className="text-xs text-gray-500 dark:text-gray-500">{player.contact_number}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {teamPlayers.length === 0 && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No players registered</p>
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