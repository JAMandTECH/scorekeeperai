import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PlayerRow from "../components/coach/PlayerRow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye } from "lucide-react";

// 0 = All periods (cumulative); 1..N = individual period/set
const PERIODS = [0, 1, 2, 3, 4, 5, 6, 7];

const STAT_KEYS = [
  "points", "rebounds", "assists", "steals", "blocks", "fouls",
  "three_pointers", "field_goals_made", "free_throws_made",
  "aces", "attacks", "rally_errors",
];

export default function CoachScoring() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get("gameId");

  const [periodIdx, setPeriodIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("home");

  const queryClient = useQueryClient();

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ["game", gameId],
    enabled: Boolean(gameId),
    queryFn: () => base44.entities.Game.get(gameId),
  });

  const { data: homeTeam } = useQuery({
    queryKey: ["team", game?.home_team_id],
    enabled: !!game?.home_team_id,
    queryFn: () => base44.entities.Team.get(game.home_team_id),
  });

  const { data: awayTeam } = useQuery({
    queryKey: ["team", game?.away_team_id],
    enabled: !!game?.away_team_id,
    queryFn: () => base44.entities.Team.get(game.away_team_id),
  });

  const { data: homePlayers } = useQuery({
    queryKey: ["players", homeTeam?.id],
    enabled: !!homeTeam?.id,
    queryFn: () => base44.entities.Player.filter({ team_id: homeTeam.id }),
    initialData: [],
  });

  const { data: awayPlayers } = useQuery({
    queryKey: ["players", awayTeam?.id],
    enabled: !!awayTeam?.id,
    queryFn: () => base44.entities.Player.filter({ team_id: awayTeam.id }),
    initialData: [],
  });

  // Read-only fetch of all player stats for this game
  const { data: gameStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ["coachGameStats", gameId],
    enabled: Boolean(gameId),
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("getGamePlayerStats", { game_id: gameId });
        return Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        const direct = await base44.entities.PlayerGameStats.filter({ game_id: gameId });
        return Array.isArray(direct) ? direct : [];
      }
    },
  });

  // Live updates: refetch when any PlayerGameStats record changes (no writes here)
  useEffect(() => {
    if (!gameId) return;
    const unsubscribe = base44.entities.PlayerGameStats.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["coachGameStats", gameId] });
    });
    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [gameId, queryClient]);

  const sport = game?.sport || "basketball";
  const period = PERIODS[periodIdx];

  const statsByPlayer = useMemo(() => {
    const filtered = period > 0 ? gameStats.filter((s) => s.quarter === period) : gameStats;
    const map = {};
    for (const s of filtered) {
      if (!s.player_id) continue;
      if (!map[s.player_id]) {
        map[s.player_id] = {};
        for (const k of STAT_KEYS) map[s.player_id][k] = 0;
      }
      const acc = map[s.player_id];
      for (const k of STAT_KEYS) acc[k] += Number(s[k] || 0);
    }
    return map;
  }, [gameStats, period]);

  if (!gameId) {
    return (
      <div className="min-h-screen p-6 md:p-8 bg-background text-foreground">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">Coach Scoring</h1>
          <p className="text-muted-foreground">Missing gameId. Open this page with ?gameId=YOUR_GAME_ID</p>
        </div>
      </div>
    );
  }

  const periodLabel = period === 0 ? "All" : (sport === "volleyball" ? `Set ${period}` : `Period ${period}`);

  return (
    <div className="min-h-screen p-4 md:p-6 bg-background text-foreground">
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        <div className="border border-border bg-card p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-heading font-bold">Coach Scoring</h1>
                <Badge variant="secondary" className="gap-1">
                  <Eye className="w-3 h-3" />
                  Read-only
                </Badge>
              </div>
              {!gameLoading && game && (
                <p className="text-muted-foreground text-sm md:text-base">
                  {homeTeam?.name || "Home"} vs {awayTeam?.name || "Away"} • {sport}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPeriodIdx((i) => Math.max(0, i - 1))} disabled={periodIdx === 0}>-</Button>
              <div className="px-3 py-2 bg-muted text-foreground text-sm md:text-base font-medium min-w-[7rem] text-center">
                {periodLabel}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPeriodIdx((i) => Math.min(PERIODS.length - 1, i + 1))} disabled={periodIdx === PERIODS.length - 1}>+</Button>
            </div>
          </div>
        </div>

        <div className="border border-border bg-card p-3 md:p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="home">{homeTeam?.name || "Home"}</TabsTrigger>
              <TabsTrigger value="away">{awayTeam?.name || "Away"}</TabsTrigger>
            </TabsList>
            <TabsContent value="home" className="mt-4">
              <Roster players={homePlayers} sport={sport} statsByPlayer={statsByPlayer} loading={statsLoading} />
            </TabsContent>
            <TabsContent value="away" className="mt-4">
              <Roster players={awayPlayers} sport={sport} statsByPlayer={statsByPlayer} loading={statsLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Roster({ players, sport, statsByPlayer, loading }) {
  if (loading && (!players || players.length === 0)) {
    return <div className="text-muted-foreground text-sm">Loading stats…</div>;
  }
  if (!players || players.length === 0) {
    return <div className="text-muted-foreground text-sm">No players found.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:gap-4">
      {players.map((p) => (
        <PlayerRow key={p.id} player={p} sport={sport} stats={statsByPlayer[p.id]} />
      ))}
    </div>
  );
}