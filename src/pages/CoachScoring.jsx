import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PlayerRow from "../components/coach/PlayerRow";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CoachScoring() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get("gameId");

  const [period, setPeriod] = useState(1);
  const [activeTab, setActiveTab] = useState("home");

  const queryClient = useQueryClient();

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: ["game", gameId],
    enabled: Boolean(gameId),
    queryFn: async () => {
      const g = await base44.entities.Game.get(gameId);
      return g;
    },
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

  const { data: homePlayers, isLoading: playersLoadingH } = useQuery({
    queryKey: ["players", homeTeam?.id],
    enabled: !!homeTeam?.id,
    queryFn: () => base44.entities.Player.filter({ team_id: homeTeam.id }),
    initialData: [],
  });

  const { data: awayPlayers, isLoading: playersLoadingA } = useQuery({
    queryKey: ["players", awayTeam?.id],
    enabled: !!awayTeam?.id,
    queryFn: () => base44.entities.Player.filter({ team_id: awayTeam.id }),
    initialData: [],
  });

  React.useEffect(() => {
    if (game?.current_quarter) setPeriod(game.current_quarter);
  }, [game?.current_quarter]);

  const sport = game?.sport || "basketball";

  const playersByTab = useMemo(() => {
    return activeTab === "home" ? (homePlayers || []) : (awayPlayers || []);
  }, [activeTab, homePlayers, awayPlayers]);

  const teamIdByTab = activeTab === "home" ? game?.home_team_id : game?.away_team_id;

  const upsertMutation = useMutation({
    mutationFn: async ({ player, teamId, updates }) => {
      const payload = {
        game_id: game.id,
        player_id: player.id,
        team_id: teamId,
        quarter: period,
        updates,
      };
      const res = await base44.functions.invoke("upsertPlayerStat", payload);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate any stat-related queries if needed later
    },
  });

  const onLog = (player, teamId, updates) => {
    if (!game) return;
    upsertMutation.mutate({ player, teamId, updates });
  };

  if (!gameId) {
    return (
      <div className="min-h-screen p-6 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Coach Scoring</h1>
          <p className="text-slate-600">Missing gameId. Open this page with ?gameId=YOUR_GAME_ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Coach Scoring</h1>
              {!gameLoading && game && (
                <p className="text-slate-600 text-sm md:text-base">
                  {homeTeam?.name || "Home"} vs {awayTeam?.name || "Away"} • {sport}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPeriod((p) => Math.max(1, p - 1))}>-</Button>
              <div className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm md:text-base">
                {sport === 'volleyball' ? 'Set' : 'Period'}: {period}
              </div>
              <Button variant="outline" onClick={() => setPeriod((p) => p + 1)}>+</Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-3 md:p-4 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="home">{homeTeam?.name || "Home"}</TabsTrigger>
              <TabsTrigger value="away">{awayTeam?.name || "Away"}</TabsTrigger>
            </TabsList>
            <TabsContent value="home" className="mt-4">
              <Roster
                players={homePlayers}
                teamId={game?.home_team_id}
                sport={sport}
                game={game}
                onLog={onLog}
                isLoading={upsertMutation.isPending}
              />
            </TabsContent>
            <TabsContent value="away" className="mt-4">
              <Roster
                players={awayPlayers}
                teamId={game?.away_team_id}
                sport={sport}
                game={game}
                onLog={onLog}
                isLoading={upsertMutation.isPending}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Roster({ players, teamId, sport, game, onLog, isLoading }) {
  if (!players || players.length === 0) {
    return <div className="text-slate-500 text-sm">No players found.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:gap-4">
      {players.map((p) => (
        <PlayerRow key={p.id} player={p} teamId={teamId} game={game} sport={sport} onLog={onLog} isLoading={isLoading} />
      ))}
    </div>
  );
}