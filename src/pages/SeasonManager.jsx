import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarPlus, Archive, AlertTriangle, Loader2, Trophy, ArrowLeft, Sun, Moon, LogOut } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function SeasonManager() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [view, setView] = useState("main");
  const [form, setForm] = useState({ name: "", sport: "basketball", start_date: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const orgId = user?.active_organization_id || user?.organization_id;

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);
    if (savedDarkMode) document.documentElement.classList.add("dark");
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", next.toString());
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      let u = currentUser;
      try {
        const allUsers = await base44.entities.User.list();
        const freshUser = allUsers.find((x) => x.id === currentUser.id);
        if (freshUser) u = { ...currentUser, ...freshUser };
      } catch (_) {}
      setUser(u);
    } catch (error) {
      base44.auth.redirectToLogin("/SeasonManager");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => base44.auth.logout("/");

  const { data: organization } = useQuery({
    queryKey: ["user-organization", orgId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getUserOrganization", {});
      return res.data?.organization || null;
    },
    enabled: !!orgId,
  });

  const { data: activeSeason, isLoading } = useQuery({
    queryKey: ["active-season", orgId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getActiveSeason", { organization_id: orgId });
      return res.data?.season || null;
    },
    enabled: !!orgId,
  });

  const reset = () => {
    setView("main");
    setForm({ name: "", sport: "basketball", start_date: "", notes: "" });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Season name is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.Season.create({
        organization_id: orgId,
        name: form.name.trim(),
        sport: form.sport,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
        notes: form.notes.trim() || undefined,
        status: "active",
        created_by: user?.email,
      });
      queryClient.invalidateQueries({ queryKey: ["active-season", orgId] });
      queryClient.invalidateQueries({ queryKey: ["archived-seasons", orgId] });
      toast({ title: `Season "${form.name}" is now open`, description: "New games, teams, and players will be tagged to this season." });
      reset();
    } catch (e) {
      toast({ title: "Failed to open season", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("archiveSeason", { season_id: activeSeason.id });
      const data = res.data || {};
      queryClient.invalidateQueries({ queryKey: ["active-season", orgId] });
      queryClient.invalidateQueries({ queryKey: ["archived-seasons", orgId] });
      queryClient.invalidateQueries({ queryKey: ["teams", orgId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-games", orgId] });
      queryClient.invalidateQueries({ queryKey: ["players", orgId] });
      toast({
        title: "Season archived",
        description: data.champion
          ? `Champion: ${data.champion.name}. ${data.archived?.games || 0} games preserved.`
          : `${data.archived?.games || 0} games preserved.`,
      });
      reset();
    } catch (e) {
      toast({ title: "Archive failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
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
            <div className="max-w-3xl mx-auto space-y-8">
              <div>
                <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
                <h1 className="font-heading text-3xl font-bold tracking-tight flex items-center gap-3">
                  <CalendarPlus className="w-8 h-8 text-primary" />
                  Season Manager
                </h1>
                <p className="text-muted-foreground mt-2 font-medium">
                   Open a new season for fresh data, or archive the current season to preserve its results.
                 </p>
              </div>

              {view === "main" && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {isLoading ? (
                      <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                    ) : activeSeason ? (
                      <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Season</span>
                          <span className="flex items-center gap-1.5 text-xs font-heading font-bold text-primary">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> OPEN
                          </span>
                        </div>
                        <p className="text-lg font-heading font-bold">{activeSeason.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="capitalize">{activeSeason.sport}</span>
                          {activeSeason.start_date && <span>· {new Date(activeSeason.start_date).toLocaleDateString()}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">
                          New games, teams, and players are tagged to this season. Archive it to start a new one.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-center">
                        <p className="text-sm font-semibold">No active season</p>
                        <p className="text-xs text-muted-foreground mt-1">Open a new season to start tracking fresh data.</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <Button onClick={() => setView("create")} disabled={!!activeSeason} className="w-full">
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        Open New Season
                      </Button>
                      {activeSeason && (
                        <Button onClick={() => setView("archiveConfirm")} variant="destructive" className="w-full">
                          <Archive className="w-4 h-4 mr-2" />
                          Archive "{activeSeason.name}"
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {view === "create" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CalendarPlus className="w-5 h-5 text-primary" /> Open New Season</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="season-name">Season Name</Label>
                      <Input id="season-name" placeholder="e.g. 2026 Winter League" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Sport</Label>
                      <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basketball">Basketball</SelectItem>
                          <SelectItem value="volleyball">Volleyball</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="season-start">Start Date (optional)</Label>
                      <Input id="season-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="season-notes">Notes (optional)</Label>
                      <Textarea id="season-notes" placeholder="Any notes about this season..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setView("main")} disabled={submitting}>Back</Button>
                      <Button onClick={handleCreate} disabled={submitting || !form.name.trim()}>
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarPlus className="w-4 h-4 mr-2" />}
                        Open Season
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {view === "archiveConfirm" && activeSeason && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> Archive Season</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription className="font-semibold">
                        This will copy all current games, teams, players, stats, tournaments, and divisions into archive tables, then clear them from your live working set.
                      </AlertDescription>
                    </Alert>
                    <div className="rounded-lg border p-4 space-y-2 bg-muted/40">
                      <p className="text-sm text-muted-foreground">You are about to archive:</p>
                      <p className="text-lg font-heading font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />{activeSeason.name}</p>
                      <p className="text-xs text-muted-foreground">
                        The season's final standings, champion, and top leaders will be saved to the Past Seasons page. This action cannot be undone from the live set — full data recovery is only possible via the backup system.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setView("main")} disabled={submitting}>Cancel</Button>
                      <Button variant="destructive" onClick={handleArchive} disabled={submitting}>
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                        Archive & Clear Live Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}