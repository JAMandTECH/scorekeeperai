import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarPlus, Archive, AlertTriangle, Loader2, Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SeasonManager({ open, onClose, organization, user }) {
  const orgId = organization?.id || user?.active_organization_id || user?.organization_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [view, setView] = useState("main"); // main | create | archiveConfirm
  const [form, setForm] = useState({ name: "", sport: "basketball", start_date: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data: activeSeason, isLoading } = useQuery({
    queryKey: ["active-season", orgId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getActiveSeason", { organization_id: orgId });
      return res.data?.season || null;
    },
    enabled: !!orgId && open,
  });

  const reset = () => {
    setView("main");
    setForm({ name: "", sport: "basketball", start_date: "", notes: "" });
  };

  const handleClose = () => {
    reset();
    onClose();
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
      onClose();
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
      onClose();
    } catch (e) {
      toast({ title: "Archive failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarPlus className="w-5 h-5 text-primary" />
            Season Manager
          </DialogTitle>
          <DialogDescription>
            Open a new season for fresh data, or archive the current season to preserve its results.
          </DialogDescription>
        </DialogHeader>

        {view === "main" && (
          <div className="space-y-4 py-2">
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : activeSeason ? (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Season</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> OPEN
                  </span>
                </div>
                <p className="text-lg font-black">{activeSeason.name}</p>
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
              <Button
                onClick={() => setView("create")}
                disabled={!!activeSeason}
                className="w-full"
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Open New Season
              </Button>
              {activeSeason && (
                <Button
                  onClick={() => setView("archiveConfirm")}
                  variant="destructive"
                  className="w-full"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive "{activeSeason.name}"
                </Button>
              )}
              <Button onClick={handleClose} variant="ghost" className="w-full">Close</Button>
            </div>
          </div>
        )}

        {view === "create" && (
          <div className="space-y-4 py-2">
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
            <DialogFooter>
              <Button variant="ghost" onClick={() => setView("main")} disabled={submitting}>Back</Button>
              <Button onClick={handleCreate} disabled={submitting || !form.name.trim()}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarPlus className="w-4 h-4 mr-2" />}
                Open Season
              </Button>
            </DialogFooter>
          </div>
        )}

        {view === "archiveConfirm" && activeSeason && (
          <div className="space-y-4 py-2">
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="font-semibold">
                This will copy all current games, teams, players, stats, tournaments, and divisions into archive tables, then clear them from your live working set.
              </AlertDescription>
            </Alert>
            <div className="rounded-lg border p-4 space-y-2 bg-muted/40">
              <p className="text-sm text-muted-foreground">You are about to archive:</p>
              <p className="text-lg font-black flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />{activeSeason.name}</p>
              <p className="text-xs text-muted-foreground">
                The season's final standings, champion, and top leaders will be saved to the Past Seasons page. This action cannot be undone from the live set — full data recovery is only possible via the backup system.
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setView("main")} disabled={submitting}>Cancel</Button>
              <Button variant="destructive" onClick={handleArchive} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                Archive & Clear Live Data
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}