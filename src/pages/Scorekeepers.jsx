import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, UserCheck, Mail, Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Scorekeepers() {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedSports, setSelectedSports] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [removingScorekeeper, setRemovingScorekeeper] = useState(null);
  const [user, setUser] = useState(null);
  // Removed organization useState, now it comes from useQuery
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

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

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    // Removed organization fetching and setting from here, now handled by useQuery
  };

  // Fetch organization using React Query
  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      // Ensure user is defined and has an organization_id
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
    },
    enabled: !!user?.organization_id, // Only run this query if user and organization_id are available
  });

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user?.organization_id,
  });

  const scorekeepers = allUsers.filter(u => 
    u.is_scorekeeper === true && 
    u.organization_id === user?.organization_id
  );

  const assignScorekeeperMutation = useMutation({
    mutationFn: async ({ userId, sports }) => {
      await base44.entities.User.update(userId, {
        is_scorekeeper: true,
        organization_id: user?.organization_id,
        scorekeeper_sports: sports,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users']);
      setShowForm(false);
      setEmail("");
      setSelectedSports([]);
      setSearchError("");
    },
  });

  const removeScorekeeperMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, {
        is_scorekeeper: false,
        scorekeeper_sports: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users']);
      setRemovingScorekeeper(null);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSearchError("");

    if (selectedSports.length === 0) {
      setSearchError("Please select at least one sport");
      return;
    }

    const foundUser = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      setSearchError("No user found with this email. The user must be registered first.");
      return;
    }

    if (foundUser.organization_id && foundUser.organization_id !== user?.organization_id) {
      setSearchError("This user belongs to another organization.");
      return;
    }

    if (foundUser.is_scorekeeper && foundUser.organization_id === user?.organization_id) {
      setSearchError("This user is already a scorekeeper for your organization.");
      return;
    }

    assignScorekeeperMutation.mutate({ userId: foundUser.id, sports: selectedSports });
  };

  const handleSportToggle = (sport) => {
    if (selectedSports.includes(sport)) {
      setSelectedSports(selectedSports.filter(s => s !== sport));
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const handleRemoveClick = (scorekeeper) => {
    setRemovingScorekeeper(scorekeeper);
  };

  const handleRemoveConfirm = () => {
    if (removingScorekeeper) {
      removeScorekeeperMutation.mutate(removingScorekeeper.id);
    }
  };

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
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight">Scorekeepers</h1>
                  <p className="text-muted-foreground mt-2 font-medium">Manage users who can score games</p>
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="font-medium"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Scorekeeper
                </Button>
              </div>

              {scorekeepers.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {scorekeepers.map((scorekeeper) => (
                    <Card key={scorekeeper.id} className="relative border border-border bg-card hover:border-foreground/20 transition-colors">
                       <CardHeader>
                         <div className="flex justify-between items-start">
                           <div className="flex items-center gap-3 flex-1">
                             <Avatar className="w-14 h-14 border border-border">
                               <AvatarImage src={scorekeeper.photo_url} />
                               <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                                 {scorekeeper.full_name?.substring(0, 2).toUpperCase() || 'SK'}
                               </AvatarFallback>
                             </Avatar>
                             <div className="flex-1 min-w-0">
                               <CardTitle className="text-lg font-heading font-bold truncate">
                                 {scorekeeper.full_name}
                               </CardTitle>
                               <Badge variant="outline" className="mt-2 border-border text-muted-foreground font-medium uppercase text-xs">
                                 Scorekeeper
                               </Badge>
                             </div>
                           </div>
                           <Button 
                             variant="ghost" 
                             size="icon"
                             onClick={() => handleRemoveClick(scorekeeper)}
                             className="text-muted-foreground hover:text-destructive"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       </CardHeader>
                       <CardContent className="space-y-3">
                         <div className="flex items-center gap-2 border border-border bg-background p-3">
                           <Mail className="w-4 h-4 text-muted-foreground" />
                           <span className="text-sm text-muted-foreground font-medium truncate">
                             {scorekeeper.email}
                           </span>
                         </div>

                         {scorekeeper.scorekeeper_sports && scorekeeper.scorekeeper_sports.length > 0 && (
                           <div className="border border-border bg-background p-3">
                             <p className="text-xs text-muted-foreground font-heading font-bold mb-2 uppercase tracking-wide">Can Score:</p>
                             <div className="flex gap-2 flex-wrap">
                               {scorekeeper.scorekeeper_sports.map(sport => (
                                 <Badge 
                                   key={sport}
                                   variant="outline"
                                   className="border-border text-muted-foreground font-medium uppercase text-xs"
                                 >
                                   {sport === 'basketball' ? '🏀' : '🏐'} {sport.charAt(0).toUpperCase() + sport.slice(1)}
                                 </Badge>
                               ))}
                             </div>
                           </div>
                         )}
                       </CardContent>
                     </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-24 h-24 border border-border bg-card flex items-center justify-center mx-auto mb-6">
                    <UserCheck className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-xl font-heading font-bold">No scorekeepers yet</p>
                  <p className="text-muted-foreground text-sm mt-2">Add users who can score games for your organization</p>
                </div>
              )}

              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-heading font-bold">
                      Add Scorekeeper
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Enter the email of a registered user to assign as scorekeeper
                    </p>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="font-heading font-bold text-foreground">User Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setSearchError("");
                        }}
                        placeholder="user@example.com"
                        required
                        className="bg-background border border-border text-foreground font-medium"
                      />
                      {searchError && (
                        <p className="text-sm text-destructive mt-2 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          {searchError}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="font-heading font-bold text-foreground mb-3 block">Sports Access</Label>
                      <div className="space-y-2">
                        <div 
                          onClick={() => handleSportToggle('basketball')}
                          className={`flex items-center gap-3 p-4 border border-border cursor-pointer transition-colors ${
                            selectedSports.includes('basketball')
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-foreground/30'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            selectedSports.includes('basketball')
                              ? 'border-primary bg-primary'
                              : 'border-border'
                          }`}>
                            {selectedSports.includes('basketball') && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-heading font-bold text-foreground">🏀 Basketball</p>
                            <p className="text-xs text-muted-foreground">Can score basketball games</p>
                          </div>
                        </div>

                        <div 
                          onClick={() => handleSportToggle('volleyball')}
                          className={`flex items-center gap-3 p-4 border border-border cursor-pointer transition-colors ${
                            selectedSports.includes('volleyball')
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-foreground/30'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            selectedSports.includes('volleyball')
                              ? 'border-primary bg-primary'
                              : 'border-border'
                          }`}>
                            {selectedSports.includes('volleyball') && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-heading font-bold text-foreground">🏐 Volleyball</p>
                            <p className="text-xs text-muted-foreground">Can score volleyball games</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted border border-border p-4 text-sm">
                      <p className="text-foreground font-medium">
                        💡 The user must already be registered in the system
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowForm(false);
                          setEmail("");
                          setSelectedSports([]);
                          setSearchError("");
                        }}
                        className="font-medium"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={assignScorekeeperMutation.isLoading}
                        className="font-medium"
                      >
                        {assignScorekeeperMutation.isLoading ? 'Assigning...' : 'Assign Scorekeeper'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <AlertDialog open={!!removingScorekeeper} onOpenChange={() => setRemovingScorekeeper(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">
                        Remove Scorekeeper?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      Are you sure you want to remove <span className="font-heading font-bold text-foreground">{removingScorekeeper?.full_name}</span> as a scorekeeper?
                      <br /><br />
                      They will no longer be able to score games for your organization.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-medium">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemoveConfirm}
                      className="font-medium"
                    >
                      Remove Scorekeeper
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}