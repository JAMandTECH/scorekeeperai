import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Timer as TimerIcon, Mail, Trash2, AlertTriangle } from "lucide-react";
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

export default function Timekeepers() {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [searchError, setSearchError] = useState("");
  const [removing, setRemoving] = useState(null);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);
    if (savedDarkMode) document.documentElement.classList.add("dark");
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: organization } = useQuery({
    queryKey: ["organization", user?.organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke("getUserOrganization", {});
      return res?.data?.organization || null;
    },
    enabled: !!user?.organization_id,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user?.organization_id,
  });

  const timekeepers = allUsers.filter(
    (u) => u.is_timekeeper === true && u.organization_id === user?.organization_id
  );

  const assignMutation = useMutation({
    mutationFn: async ({ userId }) => {
      await base44.entities.User.update(userId, {
        is_timekeeper: true,
        organization_id: user?.organization_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-users"]);
      setShowForm(false);
      setEmail("");
      setSearchError("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { is_timekeeper: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-users"]);
      setRemoving(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchError("");
    const found = allUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) {
      setSearchError("No user found with this email. The user must be registered first.");
      return;
    }
    if (found.organization_id && found.organization_id !== user?.organization_id) {
      setSearchError("This user belongs to another organization.");
      return;
    }
    if (found.is_timekeeper && found.organization_id === user?.organization_id) {
      setSearchError("This user is already a timekeeper for your organization.");
      return;
    }
    assignMutation.mutate({ userId: found.id });
  };

  const handleLogout = () => base44.auth.logout(createPageUrl("PublicLanding"));

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
                  <h1 className="font-heading text-3xl font-bold tracking-tight">Timekeepers</h1>
                  <p className="text-muted-foreground mt-2 font-medium">
                    Manage users who can run the game and shot clocks
                  </p>
                </div>
                <Button onClick={() => setShowForm(true)} className="font-medium">
                  <Plus className="w-5 h-5 mr-2" /> Add Timekeeper
                </Button>
              </div>

              {timekeepers.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {timekeepers.map((tk) => (
                    <Card key={tk.id} className="relative border border-border bg-card hover:border-foreground/20 transition-colors">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="w-14 h-14 border border-border">
                              <AvatarImage src={tk.photo_url} />
                              <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                                {tk.full_name?.substring(0, 2).toUpperCase() || "TK"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg font-heading font-bold truncate">{tk.full_name}</CardTitle>
                              <Badge variant="outline" className="mt-2 border-border text-muted-foreground font-medium uppercase text-xs">
                                Timekeeper
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRemoving(tk)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 border border-border bg-background p-3">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground font-medium truncate">{tk.email}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-24 h-24 border border-border bg-card flex items-center justify-center mx-auto mb-6">
                    <TimerIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-xl font-heading font-bold">No timekeepers yet</p>
                  <p className="text-muted-foreground text-sm mt-2">Add users who can run the game and shot clocks</p>
                </div>
              )}

              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-heading font-bold">Add Timekeeper</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Enter the email of a registered user to assign as timekeeper
                    </p>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="tk-email" className="font-heading font-bold text-foreground">User Email</Label>
                      <Input
                        id="tk-email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setSearchError(""); }}
                        placeholder="user@example.com"
                        required
                        className="bg-background border border-border text-foreground font-medium"
                      />
                      {searchError && (
                        <p className="text-sm text-destructive mt-2 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> {searchError}
                        </p>
                      )}
                    </div>
                    <div className="bg-muted border border-border p-4 text-sm">
                      <p className="text-foreground font-medium">💡 The user must already be registered in the system</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEmail(""); setSearchError(""); }} className="font-medium">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={assignMutation.isLoading} className="font-medium">
                        {assignMutation.isLoading ? "Assigning..." : "Assign Timekeeper"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <AlertDialog open={!!removing} onOpenChange={() => setRemoving(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">Remove Timekeeper?</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      Are you sure you want to remove <span className="font-heading font-bold text-foreground">{removing?.full_name}</span> as a timekeeper?
                      <br /><br />They will no longer be able to run clocks for your organization's games.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-medium">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => removeMutation.mutate(removing.id)} className="font-medium">
                      Remove Timekeeper
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