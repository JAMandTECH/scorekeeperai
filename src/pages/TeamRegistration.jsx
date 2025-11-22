import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, Users, Save, Send, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function TeamRegistration() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [teamData, setTeamData] = useState({
    name: "",
    sport: "basketball",
    division: "",
    coach_name: "",
    coach_contact: "",
    logo_url: ""
  });
  const [players, setPlayers] = useState([
    { jersey_number: "", first_name: "", last_name: "", position: "", contact_number: "" }
  ]);
  const [submitSuccess, setSubmitSuccess] = useState(false);
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
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("TeamRegistration"));
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
    queryKey: ['organization', user?.active_organization_id || user?.organization_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === (user?.active_organization_id || user?.organization_id));
    },
    enabled: !!(user?.active_organization_id || user?.organization_id),
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', organization?.id],
    queryFn: () => base44.entities.Division.filter({ organization_id: organization?.id }),
    enabled: !!organization?.id,
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setTeamData({ ...teamData, logo_url: file_url });
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const addPlayer = () => {
    setPlayers([...players, { jersey_number: "", first_name: "", last_name: "", position: "", contact_number: "" }]);
  };

  const removePlayer = (index) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index, field, value) => {
    const newPlayers = [...players];
    newPlayers[index][field] = value;
    setPlayers(newPlayers);
  };

  const submitTeamMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id || !user?.email) {
        throw new Error("Organization or user not found");
      }

      // Create team with pending status
      const team = await base44.entities.Team.create({
        organization_id: organization.id,
        name: teamData.name,
        sport: teamData.sport,
        division: teamData.division,
        coach_name: teamData.coach_name,
        coach_contact: teamData.coach_contact,
        logo_url: teamData.logo_url,
        status: "pending",
        submitted_by: user.email,
        wins: 0,
        losses: 0
      });

      // Create players for the team
      const playerPromises = players
        .filter(p => p.first_name && p.last_name && p.jersey_number)
        .map(player =>
          base44.entities.Player.create({
            team_id: team.id,
            jersey_number: player.jersey_number,
            first_name: player.first_name,
            last_name: player.last_name,
            position: player.position,
            contact_number: player.contact_number
          })
        );

      await Promise.all(playerPromises);

      return team;
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      queryClient.invalidateQueries(['teams']);
      // Reset form
      setTimeout(() => {
        setTeamData({
          name: "",
          sport: "basketball",
          division: "",
          coach_name: "",
          coach_contact: "",
          logo_url: ""
        });
        setPlayers([{ jersey_number: "", first_name: "", last_name: "", position: "", contact_number: "" }]);
        setSubmitSuccess(false);
      }, 3000);
    },
    onError: (error) => {
      console.error("Error submitting team:", error);
      alert(`Failed to submit team: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!teamData.name || !teamData.sport) {
      alert("Please fill in team name and sport");
      return;
    }

    const validPlayers = players.filter(p => p.first_name && p.last_name && p.jersey_number);
    if (validPlayers.length === 0) {
      alert("Please add at least one player with name and jersey number");
      return;
    }

    submitTeamMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const sportDivisions = divisions.filter(d => d.sport === teamData.sport);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900">
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
            <div className="max-w-4xl mx-auto space-y-8">
              <div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">Team Registration</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Register your team for {organization?.name || 'the organization'}
                </p>
              </div>

              {submitSuccess && (
                <Alert className="bg-green-50 dark:bg-green-950/30 border-2 border-green-300 dark:border-green-800">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-300 font-bold">
                    ✅ Team submitted successfully! Your team is pending admin approval.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Team Details */}
                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
                    <CardTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      Team Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="font-bold text-gray-700 dark:text-gray-300">Team Name *</Label>
                        <Input
                          value={teamData.name}
                          onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                          required
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium"
                          placeholder="Enter team name"
                        />
                      </div>
                      <div>
                        <Label className="font-bold text-gray-700 dark:text-gray-300">Sport *</Label>
                        <select
                          value={teamData.sport}
                          onChange={(e) => setTeamData({ ...teamData, sport: e.target.value, division: "" })}
                          required
                          className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                        >
                          <option value="basketball">Basketball</option>
                          <option value="volleyball">Volleyball</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label className="font-bold text-gray-700 dark:text-gray-300">Division</Label>
                      <select
                        value={teamData.division}
                        onChange={(e) => setTeamData({ ...teamData, division: e.target.value })}
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="">Select division (optional)</option>
                        {sportDivisions.map(div => (
                          <option key={div.id} value={div.name}>{div.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="font-bold text-gray-700 dark:text-gray-300">Coach Name</Label>
                        <Input
                          value={teamData.coach_name}
                          onChange={(e) => setTeamData({ ...teamData, coach_name: e.target.value })}
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium"
                          placeholder="Coach full name"
                        />
                      </div>
                      <div>
                        <Label className="font-bold text-gray-700 dark:text-gray-300">Coach Contact</Label>
                        <Input
                          value={teamData.coach_contact}
                          onChange={(e) => setTeamData({ ...teamData, coach_contact: e.target.value })}
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium"
                          placeholder="Phone or email"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="font-bold text-gray-700 dark:text-gray-300">Team Logo</Label>
                      <div className="flex gap-4 items-center">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600"
                        />
                        {uploadingLogo && (
                          <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent"></div>
                        )}
                        {teamData.logo_url && (
                          <img src={teamData.logo_url} alt="Team logo" className="w-16 h-16 object-cover rounded-lg border-2 border-blue-400 shadow-md" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Player Lineup */}
                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-white dark:from-gray-800 dark:to-gray-900">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        Player Lineup
                      </CardTitle>
                      <Button
                        type="button"
                        onClick={addPlayer}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Player
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {players.map((player, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                          <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                            Player {index + 1}
                          </Badge>
                          {players.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePlayer(index)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Jersey # *</Label>
                            <Input
                              value={player.jersey_number}
                              onChange={(e) => updatePlayer(index, 'jersey_number', e.target.value)}
                              className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 font-medium"
                              placeholder="#"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">First Name *</Label>
                            <Input
                              value={player.first_name}
                              onChange={(e) => updatePlayer(index, 'first_name', e.target.value)}
                              className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 font-medium"
                              placeholder="First name"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Last Name *</Label>
                            <Input
                              value={player.last_name}
                              onChange={(e) => updatePlayer(index, 'last_name', e.target.value)}
                              className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 font-medium"
                              placeholder="Last name"
                            />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3 mt-3">
                          <div>
                            <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Position</Label>
                            <Input
                              value={player.position}
                              onChange={(e) => updatePlayer(index, 'position', e.target.value)}
                              className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 font-medium"
                              placeholder="e.g., Guard, Forward"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Contact Number</Label>
                            <Input
                              value={player.contact_number}
                              onChange={(e) => updatePlayer(index, 'contact_number', e.target.value)}
                              className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 font-medium"
                              placeholder="Phone number"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(createPageUrl("Home"))}
                    className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitTeamMutation.isLoading}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold shadow-xl"
                  >
                    {submitTeamMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit for Approval
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}