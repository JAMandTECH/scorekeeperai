import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, Users, ArrowLeftRight, AlertCircle } from "lucide-react";

const LINEUP_SIZES = { basketball: 5, volleyball: 6 };

export default function LineupManager({
  game,
  team,
  players = [],
  sport = "basketball",
  playerStats,
  currentPeriod,
  onLineupChange,
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [subDialog, setSubDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  const lineupSize = LINEUP_SIZES[sport] || 5;
  const lineup = game?.active_lineup || { home: [], away: [] };
  const activeIds = lineup[team] || [];

  const sortedPlayers = (list) =>
    [...list].sort((a, b) => {
      const an = parseInt(a.jersey_number || "0", 10);
      const bn = parseInt(b.jersey_number || "0", 10);
      if (!isNaN(an) && !isNaN(bn) && an !== bn) return an - bn;
      return String(a.jersey_number || "").localeCompare(String(b.jersey_number || ""));
    });

  const getPlayerById = (id) => players.find((p) => p.id === id);

  const getPlusMinus = (playerId) => {
    let total = 0;
    for (let q = 1; q <= (currentPeriod || 1); q++) {
      const key = `${playerId}_${q}`;
      total += playerStats?.[key]?.plus_minus || 0;
    }
    return total;
  };

  const handleOpenSelect = () => {
    setSelectedIds(activeIds);
    setSelecting(true);
  };

  const handleToggle = (playerId) => {
    setSelectedIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : prev.length < lineupSize
          ? [...prev, playerId]
          : prev
    );
  };

  const handleConfirm = async () => {
    if (selectedIds.length !== lineupSize) return;
    setSaving(true);
    try {
      const resp = await base44.functions.invoke("manageLineup", {
        game_id: game.id,
        action: "set_starters",
        team,
        player_ids: selectedIds,
      });
      if (resp?.data?.game) onLineupChange?.(resp.data.game);
      setSelecting(false);
      setSelectedIds([]);
    } catch (e) {
      console.error("Failed to set starters:", e);
      alert(e?.response?.data?.error || "Failed to set starting lineup.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubstitute = async (inPlayerId) => {
    if (!subDialog || !inPlayerId) return;
    setSaving(true);
    try {
      const resp = await base44.functions.invoke("manageLineup", {
        game_id: game.id,
        action: "substitute",
        team,
        out_player_id: subDialog.outPlayer.id,
        in_player_id: inPlayerId,
      });
      if (resp?.data?.game) onLineupChange?.(resp.data.game);
      setSubDialog(null);
    } catch (e) {
      console.error("Failed to substitute:", e);
      alert(e?.response?.data?.error || "Failed to substitute.");
    } finally {
      setSaving(false);
    }
  };

  const activePlayers = activeIds.map(getPlayerById).filter(Boolean);

  // No lineup set yet — show the "set starters" button
  if (activePlayers.length === 0) {
    return (
      <>
        <button
          onClick={handleOpenSelect}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 border border-dashed border-border rounded-sm hover:border-primary/50 hover:bg-muted/50 transition-colors mb-2"
        >
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-heading font-bold text-muted-foreground">
            Set Starting {lineupSize} Players
          </span>
        </button>
        {renderSelectDialog()}
      </>
    );
  }

  return (
    <>
      <div className="mb-2 p-2 bg-muted/40 border border-border rounded-sm">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-wider">
            On Court ({activePlayers.length}/{lineupSize})
          </span>
          <button
            onClick={handleOpenSelect}
            className="text-[10px] font-heading font-bold text-primary hover:underline"
          >
            Reset
          </button>
        </div>
        <div className="space-y-1">
          {activePlayers.map((player) => {
            const pm = getPlusMinus(player.id);
            return (
              <div
                key={player.id}
                className="flex items-center gap-2 p-1.5 bg-card border border-border rounded-sm"
              >
                <Avatar className="w-7 h-7 border border-border flex-shrink-0">
                  <AvatarImage src={player.photo_url} />
                  <AvatarFallback className="text-[10px] font-heading font-bold bg-secondary text-foreground">
                    {player.jersey_number}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-heading font-bold text-foreground truncate">
                    {player.first_name} {player.last_name}
                  </p>
                </div>
                <span
                  className={`text-sm font-heading font-bold tabular-nums flex-shrink-0 ${
                    pm > 0 ? "text-primary" : pm < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {pm > 0 ? "+" : ""}
                  {pm}
                </span>
                <Button
                  onClick={() => setSubDialog({ outPlayer: player })}
                  variant="outline"
                  size="sm"
                  className="h-6 px-1.5 text-[10px] font-heading font-bold border-border flex-shrink-0"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      {renderSelectDialog()}
      {renderSubDialog()}
    </>
  );

  function renderSelectDialog() {
    if (!selecting) return null;
    const roster = sortedPlayers(players);

    return (
      <Dialog open={selecting} onOpenChange={(open) => !open && setSelecting(false)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Set Starting Lineup
            </DialogTitle>
            <DialogDescription>
              Select exactly {lineupSize} players to start.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mb-2">
            <Badge
              variant={selectedIds.length === lineupSize ? "default" : "outline"}
              className="font-heading font-bold"
            >
              {selectedIds.length} / {lineupSize} Selected
            </Badge>
            {selectedIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="text-xs">
                Clear
              </Button>
            )}
          </div>

          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {roster.map((player) => {
              const isSelected = selectedIds.includes(player.id);
              const isFull = selectedIds.length >= lineupSize && !isSelected;
              return (
                <button
                  key={player.id}
                  onClick={() => handleToggle(player.id)}
                  disabled={isFull}
                  className={`w-full flex items-center gap-3 p-2.5 border rounded-sm transition-all ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : isFull
                        ? "bg-muted/30 border-border opacity-50 cursor-not-allowed"
                        : "bg-card border-border hover:border-foreground/30"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-primary-foreground border-primary-foreground" : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-primary" />}
                  </div>
                  <Avatar className="w-9 h-9 border border-border">
                    <AvatarImage src={player.photo_url} />
                    <AvatarFallback
                      className={`text-xs font-heading font-bold ${
                        isSelected ? "bg-primary-foreground text-primary" : "bg-secondary text-foreground"
                      }`}
                    >
                      {player.jersey_number}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className={`text-sm font-heading font-bold truncate ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                      {player.first_name} {player.last_name}
                    </p>
                    {player.position && (
                      <p className={`text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {player.position}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {roster.length < lineupSize && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-sm">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-xs text-foreground font-medium">
                Only {roster.length} players on roster. {lineupSize} required for a full lineup.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setSelecting(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.length !== lineupSize || saving}
              className="flex-1 font-heading font-bold"
            >
              {saving ? "Saving..." : "Confirm Starters"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  function renderSubDialog() {
    if (!subDialog) return null;
    const roster = sortedPlayers(players);
    const bench = roster.filter((p) => !activeIds.includes(p.id));

    return (
      <Dialog open={!!subDialog} onOpenChange={(open) => !open && setSubDialog(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Substitute
            </DialogTitle>
            <DialogDescription>
              <span className="font-bold text-foreground">
                {subDialog.outPlayer.first_name} {subDialog.outPlayer.last_name}
              </span>{" "}
              (#{subDialog.outPlayer.jersey_number}) going out. Select incoming player.
            </DialogDescription>
          </DialogHeader>

          {bench.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground font-medium">
              No players on the bench.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {bench.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSubstitute(player.id)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-2.5 border border-border rounded-sm bg-card hover:border-primary/50 hover:bg-muted/50 transition-all"
                >
                  <Avatar className="w-9 h-9 border border-border">
                    <AvatarImage src={player.photo_url} />
                    <AvatarFallback className="text-xs font-heading font-bold bg-secondary text-foreground">
                      {player.jersey_number}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-heading font-bold text-foreground truncate">
                      {player.first_name} {player.last_name}
                    </p>
                    {player.position && (
                      <p className="text-xs text-muted-foreground">{player.position}</p>
                    )}
                  </div>
                  <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          <Button variant="outline" onClick={() => setSubDialog(null)} disabled={saving}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    );
  }
}