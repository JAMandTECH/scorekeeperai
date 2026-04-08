import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Shield, Target, TrendingUp, Zap } from "lucide-react";
import TopAssistLeaders from "@/components/leaders/TopAssistLeaders";
import GameCompactStats from "@/components/stats/GameCompactStats";
import AIGameSummary from "@/components/AIGameSummary";

export default function VeteransBasketballSection({
  organization,
  orgId,
  topScorersVeterans = [],
  topReboundersVeterans = [],
  topBlockersVeterans = [],
  top3PointersVeterans = [],
  upcomingBasketballGamesVeterans = [],
  completedBasketballGamesVeterans = [],
  allPlayerStats = [],
  allPlayers = [],
  allTeams = [],
  isAdmin = false,
  getTeamName,
}) {
  return (
    <div className="mt-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white">Veterans Division</h3>
      </div>

      <Tabs defaultValue="leaders" className="space-y-8">
        <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="leaders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white dark:text-gray-300 font-semibold rounded-lg px-6">Player Leaders</TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white dark:text-gray-300 font-semibold rounded-lg px-6">Schedule & Results</TabsTrigger>
        </TabsList>

        <TabsContent value="leaders">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Scorers — Veterans */}
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Scorers — Veterans</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {topScorersVeterans.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No data available.</div>
                  )}
                  {topScorersVeterans.map((player, i) => (
                    <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                        i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                        i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                        i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                        'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                      }`}>
                        {i + 1}
                      </div>
                      <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                        <AvatarImage src={player.photo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-bold">
                          {player.jersey_number}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{player.first_name} {player.last_name}</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                            <AvatarImage src={player.teamLogoUrl} />
                            <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{player.total}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Rebounders — Veterans */}
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Rebounders — Veterans</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {topReboundersVeterans.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No data available.</div>
                  )}
                  {topReboundersVeterans.map((player, i) => (
                    <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                        i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                        i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                        i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                        'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                      }`}>
                        {i + 1}
                      </div>
                      <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                        <AvatarImage src={player.photo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-green-600 to-green-700 text-white text-xs font-bold">
                          {player.jersey_number}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{player.first_name} {player.last_name}</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                            <AvatarImage src={player.teamLogoUrl} />
                            <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-green-600 dark:text-green-400">{player.total}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Blockers — Veterans */}
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-red-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 Blockers — Veterans</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {topBlockersVeterans.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No data available.</div>
                  )}
                  {topBlockersVeterans.map((player, i) => (
                    <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                        i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                        i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                        i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                        'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                      }`}>
                        {i + 1}
                      </div>
                      <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                        <AvatarImage src={player.photo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-red-600 to-red-700 text-white text-xs font-bold">
                          {player.jersey_number}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{player.first_name} {player.last_name}</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                            <AvatarImage src={player.teamLogoUrl} />
                            <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-red-600 dark:text-red-400">{player.total}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Assists — Veterans */}
            <TopAssistLeaders organizationId={orgId} sport="basketball" division="Veterans" title="Top 10 Assist Leaders — Veterans" orgName={organization?.name} orgLogoUrl={organization?.logo_url} />

            {/* 3PT — Veterans */}
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-yellow-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Top 10 3-Pointer Leaders — Veterans</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {top3PointersVeterans.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No data available.</div>
                  )}
                  {top3PointersVeterans.map((player, i) => (
                    <div key={player.id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                        i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900' :
                        i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                        i === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                        'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                      }`}>
                        {i + 1}
                      </div>
                      <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                        <AvatarImage src={player.photo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-yellow-600 to-yellow-700 text-white text-xs font-bold">
                          {player.jersey_number}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{player.first_name} {player.last_name}</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                            <AvatarImage src={player.teamLogoUrl} />
                            <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{player.teamName?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{player.teamName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{player.total}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{player.average} {player.averageLabel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Upcoming — Veterans */}
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
              <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
                <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Upcoming — Veterans</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {upcomingBasketballGamesVeterans.map(game => (
                    <div key={game.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(game.game_date).toLocaleDateString()}
                        </span>
                        <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                          {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR'}
                        </Badge>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {getTeamName(game.home_team_id)} vs {getTeamName(game.away_team_id)}
                      </div>
                      {game.location && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">📍 {game.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Results — Veterans */}
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
              <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-white dark:from-gray-800 dark:to-gray-900">
                <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Recent Results — Veterans</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {completedBasketballGamesVeterans.map(game => {
                    const winningTeamId = game.home_score > game.away_score ? game.home_team_id : game.away_team_id;
                    const statsForGame = allPlayerStats.filter(s => s.game_id === game.id);
                    const totalsMap = new Map();
                    statsForGame.filter(s => s.team_id === winningTeamId).forEach(s => {
                      const id = s.player_id;
                      if (!totalsMap.has(id)) totalsMap.set(id, { points: 0, rebounds: 0, assists: 0, blocks: 0 });
                      const agg = totalsMap.get(id);
                      agg.points += s.points || 0;
                      agg.rebounds += s.rebounds || 0;
                      agg.assists += s.assists || 0;
                      agg.blocks += s.blocks || 0;
                    });
                    const bestEntry = Array.from(totalsMap.entries()).reduce((best, [pid, vals]) => (!best || vals.points > best.vals.points) ? { pid, vals } : best, null);
                    const bestPlayer = bestEntry ? allPlayers.find(p => p.id === bestEntry.pid) : null;
                    const bestTotals = bestEntry?.vals || null;
                    const homeTeamData = allTeams.find(t => t.id === game.home_team_id);
                    const awayTeamData = allTeams.find(t => t.id === game.away_team_id);
                    const topPlayersForAI = [];
                    if (bestPlayer && bestTotals) {
                      topPlayersForAI.push({ name: `${bestPlayer.first_name} ${bestPlayer.last_name}`, team: getTeamName(winningTeamId), stats: `${bestTotals.points} PTS • ${bestTotals.rebounds || 0} REB • ${bestTotals.assists || 0} AST` });
                    }
                    return (
                      <div key={game.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{new Date(game.game_date).toLocaleDateString()}</span>
                          <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-xs font-bold">FINAL</Badge>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                              <AvatarImage src={homeTeamData?.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">{homeTeamData?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{getTeamName(game.home_team_id)}</div>
                              <div className="text-3xl font-black text-gray-900 dark:text-white mt-1">{game.home_score}</div>
                            </div>
                          </div>
                          <div className="text-gray-300 dark:text-gray-600 text-2xl font-black px-4">-</div>
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <div className="flex-1 min-w-0 text-right">
                              <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{getTeamName(game.away_team_id)}</div>
                              <div className="text-3xl font-black text-gray-900 dark:text-white mt-1">{game.away_score}</div>
                            </div>
                            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                              <AvatarImage src={awayTeamData?.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">{awayTeamData?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        {bestPlayer && bestTotals && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">⭐ Best Player (Winner):</p>
                            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800">
                              <Avatar className="w-8 h-8 border-2 border-white dark:border-gray-700">
                                <AvatarImage src={bestPlayer.photo_url} />
                                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">{bestPlayer.jersey_number}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">#{bestPlayer.jersey_number} {bestPlayer.first_name} {bestPlayer.last_name}</p>
                                <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">{bestTotals?.points || 0} PTS • {bestTotals?.rebounds || 0} REB • {bestTotals?.assists || 0} AST</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-bold text-blue-600 dark:text-blue-400">Player Stats</summary>
                          <div className="mt-2">
                            <GameCompactStats game={game} allPlayerStats={allPlayerStats} allPlayers={allPlayers} sport="basketball" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}