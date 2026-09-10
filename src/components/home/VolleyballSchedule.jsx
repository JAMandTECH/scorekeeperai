import React from "react";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import GameCompactStats from "@/components/stats/GameCompactStats";
import AIGameSummary from "@/components/AIGameSummary";

export default function VolleyballSchedule({
  upcomingGames,
  completedGames,
  allPlayerStats,
  allPlayers,
  allTeams,
  isAdmin,
  getTeamName,
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-base font-heading font-bold">Upcoming Games</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {upcomingGames.map((game) => (
              <div key={game.id} className="border border-border p-4 hover:bg-muted transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
                    <Calendar className="w-3 h-3" />
                    {new Date(game.game_date).toLocaleDateString()}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR'}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-foreground">
                  {getTeamName(game.home_team_id)} vs {getTeamName(game.away_team_id)}
                </div>
                {game.location && (
                  <p className="text-xs text-muted-foreground mt-1">{game.location}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-base font-heading font-bold">Recent Results</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {completedGames.map((game) => {
              const hasSets = Array.isArray(game.quarter_scores) && game.quarter_scores.length > 0;
              const homeTotalPoints = hasSets ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0) : Number(game.home_score ?? 0);
              const awayTotalPoints = hasSets ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0) : Number(game.away_score ?? 0);
              const homeSetsWon = hasSets ? (game.quarter_scores || []).filter((s) => s.home > s.away).length : 0;
              const awaySetsWon = hasSets ? (game.quarter_scores || []).filter((s) => s.away > s.home).length : 0;
              const winningTeamId = hasSets ? (homeSetsWon > awaySetsWon ? game.home_team_id : game.away_team_id) : (homeTotalPoints >= awayTotalPoints ? game.home_team_id : game.away_team_id);
              const statsForGame = allPlayerStats.filter((s) => s.game_id === game.id);
              const totalsMap = new Map();
              statsForGame.filter((s) => s.team_id === winningTeamId).forEach((s) => {
                const id = s.player_id;
                if (!totalsMap.has(id)) totalsMap.set(id, { points: 0, attacks: 0, aces: 0, blocks: 0 });
                const agg = totalsMap.get(id);
                const vbAttacks = s.attacks ?? s.field_goals_made ?? 0;
                const vbAces = s.aces ?? s.three_pointers ?? 0;
                agg.attacks += vbAttacks;
                agg.aces += vbAces;
                agg.blocks += s.blocks || 0;
                agg.points += vbAttacks + vbAces + (s.blocks || 0);
              });
              const bestEntry = Array.from(totalsMap.entries()).reduce(
                (best, [pid, vals]) => !best || vals.points > best.vals.points ? { pid, vals } : best, null
              );
              const bestPlayer = bestEntry ? allPlayers.find((p) => p.id === bestEntry.pid) : null;
              const bestTotals = bestEntry?.vals || null;
              const homeTeamData = allTeams.find((t) => t.id === game.home_team_id);
              const awayTeamData = allTeams.find((t) => t.id === game.away_team_id);
              const topPlayersForAI = [];
              if (bestPlayer && bestTotals) topPlayersForAI.push({
                name: `${bestPlayer.first_name} ${bestPlayer.last_name}`,
                team: getTeamName(winningTeamId),
                stats: `${bestTotals.attacks || 0} ATK • ${bestTotals.blocks || 0} BLK • ${bestTotals.aces || 0} ACE`,
              });

              return (
                <div key={game.id} className="border border-border p-4 hover:bg-muted transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-muted-foreground tabular-nums">{new Date(game.game_date).toLocaleDateString()}</span>
                    <Badge variant="outline" className="text-[10px] font-medium">FINAL</Badge>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-9 h-9 border border-border bg-secondary">
                        <AvatarImage src={homeTeamData?.logo_url} />
                        <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">{homeTeamData?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{getTeamName(game.home_team_id)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-heading text-2xl font-bold tabular-nums">{homeTotalPoints}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">({homeSetsWon} sets)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-9 h-9 border border-border bg-secondary">
                        <AvatarImage src={awayTeamData?.logo_url} />
                        <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">{awayTeamData?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{getTeamName(game.away_team_id)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-heading text-2xl font-bold tabular-nums">{awayTotalPoints}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">({awaySetsWon} sets)</div>
                      </div>
                    </div>
                  </div>
                  {bestPlayer && bestTotals && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Best Player (Winner):</p>
                      <div className="flex items-center gap-2 border border-border bg-secondary p-2">
                        <Avatar className="w-7 h-7 border border-border bg-card">
                          <AvatarImage src={bestPlayer.photo_url} />
                          <AvatarFallback className="bg-card text-foreground text-xs font-heading font-bold">{bestPlayer.jersey_number}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">#{bestPlayer.jersey_number} {bestPlayer.first_name} {bestPlayer.last_name}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">{bestTotals?.attacks || 0} ATK • {bestTotals?.blocks || 0} BLK • {bestTotals?.aces || 0} ACE</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {game.quarter_scores && game.quarter_scores.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Set Scores:</p>
                      <div className="flex flex-wrap gap-2">
                        {game.quarter_scores.map((set, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs font-medium tabular-nums">
                            {set.home}-{set.away}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">Player Stats</summary>
                    <div className="mt-2">
                      <GameCompactStats game={game} allPlayerStats={allPlayerStats} allPlayers={allPlayers} sport="volleyball" />
                    </div>
                  </details>
                  {isAdmin && homeTeamData && awayTeamData && topPlayersForAI.length > 0 && (
                    <div className="mt-3">
                      <AIGameSummary game={game} homeTeam={homeTeamData} awayTeam={awayTeamData} topPlayers={topPlayersForAI} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}