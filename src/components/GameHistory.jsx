import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, ChevronDown, ChevronUp, LayoutGrid, Table as TableIcon, MapPin, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AIGameSummary from "@/components/AIGameSummary";

export default function GameHistory({
  completedGames,
  teams,
  allPlayers,
  allPlayerStats,
  selectedSport,
  selectedDivision,
  selectedTeam,
  onSportChange,
  onDivisionChange,
  onTeamChange
}) {
  const [expandedGame, setExpandedGame] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [statsByGame, setStatsByGame] = useState({});
  const [loadingGame, setLoadingGame] = useState(null);
  const [statsError, setStatsError] = useState({});
  const [extraPlayers, setExtraPlayers] = useState([]);
  const rosterCacheRef = useRef({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setIsAdmin(Boolean(u?.role === 'admin' || u?.is_super_admin));
      } catch (_) {}
    })();
  }, []);

  const playerById = useMemo(() => {
    const map = {};
    ([...(allPlayers || []), ...(extraPlayers || [])]).forEach(p => { if (p?.id) map[p.id] = p; });
    return map;
  }, [allPlayers, extraPlayers]);

  const fetchStatsForGame = async (gameId) => {
    setLoadingGame(gameId);
    setStatsError((prev) => ({ ...prev, [gameId]: null }));
    const delays = [0, 1000, 2000, 4000, 8000];
    for (let i = 0; i < delays.length; i++) {
      if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
      try {
        const res = await base44.entities.PlayerGameStats.filter({ game_id: gameId }, '-updated_date', 200);
        let arr = Array.isArray(res) ? res : [];
        if (!arr.length) {
          try {
            const resp = await base44.functions.invoke('getGamePlayerStats', { game_id: gameId });
            const fromFn = Array.isArray(resp?.data) ? resp.data : [];
            if (fromFn.length) arr = fromFn;
          } catch (_) {}
        }
        setStatsByGame((prev) => ({ ...prev, [gameId]: arr }));
        setLoadingGame(null);
        return;
      } catch (e) {
        if (i === delays.length - 1) {
          setStatsError((prev) => ({ ...prev, [gameId]: e?.message || 'Failed to load' }));
          setLoadingGame(null);
        }
      }
    }
  };

  useEffect(() => {
    if (!expandedGame) return;
    if (!statsByGame[expandedGame] || statsByGame[expandedGame].length === 0) {
      fetchStatsForGame(expandedGame);
    }
  }, [expandedGame]);

  useEffect(() => {
    if (!expandedGame) return;
    const baseStats = (statsByGame[expandedGame] && statsByGame[expandedGame].length > 0)
      ? statsByGame[expandedGame]
      : (allPlayerStats || []).filter(s => s.game_id === expandedGame);
    if (!baseStats || baseStats.length === 0) return;
    const missingIds = Array.from(new Set(baseStats.map(s => s.player_id).filter(id => !playerById[id])));
    if (missingIds.length === 0) return;

    (async () => {
      try {
        const all = await base44.entities.Player.list();
        const needed = all.filter(p => missingIds.includes(p.id));
        if (needed.length) {
          setExtraPlayers(prev => {
            const existing = new Set(prev.map(p => p.id));
            const combined = [...prev];
            needed.forEach(p => { if (!existing.has(p.id)) combined.push(p); });
            return combined;
          });
        }
      } catch (_) {}
    })();
  }, [expandedGame, statsByGame, allPlayerStats, playerById]);

  const forceRefreshStats = async (gameId) => {
    setLoadingGame(gameId);
    try {
      await base44.functions.invoke('forceFinalizeAllPeriods', { game_id: gameId });
    } catch (_) {}
    await fetchStatsForGame(gameId);
  };

  useEffect(() => {
    if (!expandedGame) return;
    const game = (completedGames || []).find(g => g.id === expandedGame);
    if (!game) return;
    const teamIds = [game.home_team_id, game.away_team_id].filter(Boolean);
    const toFetch = teamIds.filter(id => !rosterCacheRef.current[id]);
    if (toFetch.length === 0) return;

    (async () => {
      try {
        const results = await Promise.all(
          toFetch.map(id => base44.entities.Player.filter({ team_id: id }, '-created_date', 200))
        );
        results.forEach((list, idx) => { rosterCacheRef.current[toFetch[idx]] = list || []; });
        const merge = results.flat().filter(Boolean);
        if (merge.length) {
          setExtraPlayers(prev => {
            const existing = new Set(prev.map(p => p.id));
            const combined = [...prev];
            merge.forEach(p => { if (p?.id && !existing.has(p.id)) combined.push(p); });
            return combined;
          });
        }
      } catch (_) {}
    })();
  }, [expandedGame, completedGames]);

  const divisions = ['all', ...new Set(teams.map(t => t.division || 'No Division').filter(Boolean))];

  const filteredTeams = teams.filter(team => {
    const sportMatch = selectedSport === 'all' || team.sport === selectedSport;
    const divisionMatch = selectedDivision === 'all' || (team.division || 'No Division') === selectedDivision;
    return sportMatch && divisionMatch;
  });

  const filteredGames = completedGames.filter(game => {
    if (selectedSport !== 'all' && game.sport !== selectedSport) return false;
    if (selectedDivision !== 'all') {
      const homeTeam = teams.find(t => t.id === game.home_team_id);
      const awayTeam = teams.find(t => t.id === game.away_team_id);
      const homeDivision = homeTeam?.division || 'No Division';
      const awayDivision = awayTeam?.division || 'No Division';
      if (homeDivision !== selectedDivision && awayDivision !== selectedDivision) return false;
    }
    if (selectedTeam !== 'all') {
      if (game.home_team_id !== selectedTeam && game.away_team_id !== selectedTeam) return false;
    }
    return true;
  });

  const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || 'Unknown';

  const getBestPlayerForTeam = (gameId, teamId, sport) => {
    const pool = (statsByGame[gameId] && statsByGame[gameId].length > 0) ? statsByGame[gameId] : allPlayerStats;
    const gameStats = pool.filter(s => s.game_id === gameId && s.team_id === teamId);
    if (gameStats.length === 0) return null;

    const totalsByPlayer = {};
    for (const s of gameStats) {
      const pid = s.player_id;
      if (!totalsByPlayer[pid]) {
        totalsByPlayer[pid] = {
          player_id: pid, team_id: teamId,
          points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, fouls: 0,
          attacks: 0, aces: 0, rally_errors: 0
        };
      }
      const t = totalsByPlayer[pid];
      t.points += s.points || 0; t.rebounds += s.rebounds || 0; t.assists += s.assists || 0;
      t.steals += s.steals || 0; t.blocks += s.blocks || 0; t.fouls += s.fouls || 0;
      t.attacks += s.attacks || 0; t.aces += s.aces || 0; t.rally_errors += s.rally_errors || 0;
    }

    const values = Object.values(totalsByPlayer);
    let best = null;
    if (sport === 'basketball') {
      best = values.reduce((b, c) => (c.points || 0) > ((b?.points) || 0) ? c : b, null);
    } else {
      best = values.reduce((b, c) => {
        const cScore = (c.attacks || 0) + (c.blocks || 0) + (c.aces || 0);
        const bScore = b ? ((b.attacks || 0) + (b.blocks || 0) + (b.aces || 0)) : 0;
        return cScore > bScore ? c : b;
      }, null);
    }
    if (!best) return null;
    return { player: playerById[best.player_id] || null, stats: best };
  };

  const getGamePlayerStats = (gameId, homeTeamId, awayTeamId) => {
    const gameStats = (statsByGame[gameId] && statsByGame[gameId].length > 0)
      ? statsByGame[gameId]
      : allPlayerStats.filter(s => s.game_id === gameId);

    const aggregateTeam = (teamId) => {
      const totals = {};
      gameStats.filter(s => s.team_id === teamId).forEach(s => {
        const pid = s.player_id;
        if (!totals[pid]) {
          totals[pid] = {
            player_id: pid, team_id: teamId,
            points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, fouls: 0,
            attacks: 0, aces: 0, rally_errors: 0,
          };
        }
        const t = totals[pid];
        t.points += s.points || 0; t.rebounds += s.rebounds || 0; t.assists += s.assists || 0;
        t.steals += s.steals || 0; t.blocks += s.blocks || 0; t.fouls += s.fouls || 0;
        t.attacks += s.attacks || 0; t.aces += s.aces || 0; t.rally_errors += s.rally_errors || 0;
      });
      return Object.values(totals).map(stat => ({ ...stat, player: playerById[stat.player_id] || null }));
    };

    return { homeStats: aggregateTeam(homeTeamId), awayStats: aggregateTeam(awayTeamId) };
  };

  const statLine = (stat, sport) => sport === 'basketball'
    ? `${stat.points || 0} PTS • ${stat.rebounds || 0} REB • ${stat.assists || 0} AST • ${stat.steals || 0} STL • ${stat.blocks || 0} BLK • ${stat.fouls || 0} FLS`
    : `${stat.attacks || 0} ATK • ${stat.blocks || 0} BLK • ${stat.aces || 0} ACE • ${stat.rally_errors || 0} ERR`;

  const bestPlayerLine = (stats, sport) => sport === 'basketball'
    ? `${stats.points} PTS • ${stats.rebounds || 0} REB • ${stats.assists || 0} AST`
    : `${stats.attacks || 0} ATK • ${stats.blocks || 0} BLK • ${stats.aces || 0} ACE`;

  const homeScore = (game) => game.sport === 'volleyball'
    ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0)
    : game.home_score;
  const awayScore = (game) => game.sport === 'volleyball'
    ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0)
    : game.away_score;

  // Shared loading/error/empty state for expanded stats (deduplicated from 8x repeated blocks)
  const StatsStatus = ({ game }) => {
    const isLoading = loadingGame === game.id || (!statsByGame[game.id] && expandedGame === game.id);
    if (isLoading) return <div className="text-xs text-muted-foreground">Loading player stats…</div>;
    if (statsError[game.id]) {
      return (
        <div className="text-xs text-destructive flex items-center gap-2">
          Failed to load stats.
          <Button size="sm" variant="outline" onClick={() => fetchStatsForGame(game.id)}>Retry</Button>
        </div>
      );
    }
    const { homeStats, awayStats } = getGamePlayerStats(game.id, game.home_team_id, game.away_team_id);
    if ((statsByGame[game.id] || (allPlayerStats && allPlayerStats.length)) && homeStats.length === 0 && awayStats.length === 0) {
      return <div className="text-xs text-muted-foreground">No player statistics recorded for this game yet.</div>;
    }
    return null;
  };

  const PlayerStatRow = ({ stat, sport }) => (
    <div className="flex items-center gap-3 bg-card border border-border p-3">
      <Avatar className="w-10 h-10 border border-border">
        <AvatarImage src={stat.player?.photo_url} />
        <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
          {stat.player?.jersey_number}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate text-sm">
          {stat.player?.first_name || 'Player'} {stat.player?.last_name || ''}
        </p>
        <p className="text-[11px] text-muted-foreground tabular-nums">{statLine(stat, sport)}</p>
      </div>
    </div>
  );

  const TeamStatsBlock = ({ game, teamId, stats }) => (
    <div>
      <p className="text-sm font-heading font-bold text-foreground mb-3">
        {getTeamName(teamId)} — Player Statistics
      </p>
      <div className="space-y-2">
        {stats.map((stat) => (
          <PlayerStatRow key={stat.player?.id || stat.player_id} stat={stat} sport={game.sport} />
        ))}
      </div>
    </div>
  );

  const BestPlayerCard = ({ game, best, teamId, accent }) => (
    <div className={`border border-border p-3 ${accent === 'home' ? 'bg-card' : 'bg-muted/50'}`}>
      <p className="text-[11px] text-muted-foreground mb-2 tracking-wide uppercase">{getTeamName(teamId)}</p>
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 border border-border">
          <AvatarImage src={best.player?.photo_url} />
          <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
            {best.player?.jersey_number}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {best.player?.first_name} {best.player?.last_name}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">{bestPlayerLine(best.stats, game.sport)}</p>
        </div>
      </div>
    </div>
  );

  const QuarterScores = ({ game }) => (
    game.quarter_scores && game.quarter_scores.length > 0 ? (
      <div className="border border-border p-3">
        <p className="text-[11px] text-muted-foreground font-medium mb-2 tracking-wide uppercase">
          {game.sport === 'basketball' ? 'Quarter Scores' : 'Set Scores'}
        </p>
        <div className="flex flex-wrap gap-2">
          {game.quarter_scores.map((score, idx) => (
            <div key={idx} className="border border-border bg-card p-2">
              <p className="text-[11px] text-muted-foreground mb-1">
                {game.sport === 'basketball' ? `Q${score.quarter}` : `Set ${score.quarter}`}
              </p>
              <p className="font-heading font-bold text-foreground tabular-nums">{score.home} - {score.away}</p>
            </div>
          ))}
        </div>
      </div>
    ) : null
  );

  const GameCard = ({ game }) => {
    const homeTeam = teams.find(t => t.id === game.home_team_id);
    const awayTeam = teams.find(t => t.id === game.away_team_id);
    const homeBestPlayer = getBestPlayerForTeam(game.id, game.home_team_id, game.sport);
    const awayBestPlayer = getBestPlayerForTeam(game.id, game.away_team_id, game.sport);
    const isExpanded = expandedGame === game.id;
    const { homeStats, awayStats } = isExpanded ? getGamePlayerStats(game.id, game.home_team_id, game.away_team_id) : { homeStats: [], awayStats: [] };

    const topPlayersForAI = [];
    if (homeBestPlayer) {
      topPlayersForAI.push({
        name: `${homeBestPlayer.player?.first_name} ${homeBestPlayer.player?.last_name}`,
        team: homeTeam?.name,
        stats: game.sport === 'basketball'
          ? `${homeBestPlayer.stats.points} PTS, ${homeBestPlayer.stats.rebounds || 0} REB, ${homeBestPlayer.stats.assists || 0} AST`
          : `${homeBestPlayer.stats.attacks || 0} ATK, ${homeBestPlayer.stats.blocks || 0} BLK, ${homeBestPlayer.stats.aces || 0} ACE`
      });
    }
    if (awayBestPlayer) {
      topPlayersForAI.push({
        name: `${awayBestPlayer.player?.first_name} ${awayBestPlayer.player?.last_name}`,
        team: awayTeam?.name,
        stats: game.sport === 'basketball'
          ? `${awayBestPlayer.stats.points} PTS, ${awayBestPlayer.stats.rebounds || 0} REB, ${awayBestPlayer.stats.assists || 0} AST`
          : `${awayBestPlayer.stats.attacks || 0} ATK, ${awayBestPlayer.stats.blocks || 0} BLK, ${awayBestPlayer.stats.aces || 0} ACE`
      });
    }

    return (
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border py-3 px-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground tabular-nums">
                {new Date(game.game_date).toLocaleDateString()} • {new Date(game.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <Badge variant="outline" className="text-[11px] uppercase tracking-wide">{game.sport}</Badge>
          </div>
          {game.location && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />{game.location}
            </p>
          )}
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <div className="border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarImage src={homeTeam?.logo_url} />
                  <AvatarFallback className="bg-secondary text-foreground text-sm font-heading font-bold">
                    {homeTeam?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{getTeamName(game.home_team_id)}</p>
                  <p className="text-[10px] text-muted-foreground tracking-wide uppercase">Home</p>
                </div>
              </div>
              <div className="font-heading text-3xl font-bold tabular-nums text-foreground">{homeScore(game)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarImage src={awayTeam?.logo_url} />
                  <AvatarFallback className="bg-secondary text-foreground text-sm font-heading font-bold">
                    {awayTeam?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{getTeamName(game.away_team_id)}</p>
                  <p className="text-[10px] text-muted-foreground tracking-wide uppercase">Away</p>
                </div>
              </div>
              <div className="font-heading text-3xl font-bold tabular-nums text-foreground">{awayScore(game)}</div>
            </div>
          </div>

          <QuarterScores game={game} />

          {(homeBestPlayer || awayBestPlayer) && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase flex items-center gap-1.5">
                <Star className="w-3 h-3" />Best Players
              </p>
              {homeBestPlayer && <BestPlayerCard game={game} best={homeBestPlayer} teamId={game.home_team_id} accent="home" />}
              {awayBestPlayer && <BestPlayerCard game={game} best={awayBestPlayer} teamId={game.away_team_id} accent="away" />}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => { const next = isExpanded ? null : game.id; setExpandedGame(next); if (next) fetchStatsForGame(game.id); }}
          >
            {isExpanded ? <><ChevronUp className="w-4 h-4 mr-2" />Hide Full Statistics</> : <><ChevronDown className="w-4 h-4 mr-2" />View Full Statistics</>}
          </Button>

          {isExpanded && (
            <div className="space-y-4 pt-4 border-t border-border">
              <StatsStatus game={game} />
              {!loadingGame && !statsError[game.id] && homeStats.length > 0 && (
                <TeamStatsBlock game={game} teamId={game.home_team_id} stats={homeStats} />
              )}
              {!loadingGame && !statsError[game.id] && awayStats.length > 0 && (
                <TeamStatsBlock game={game} teamId={game.away_team_id} stats={awayStats} />
              )}
            </div>
          )}

          {homeTeam && awayTeam && (
            <div className="mt-4">
              <AIGameSummary game={game} homeTeam={homeTeam} awayTeam={awayTeam} topPlayers={topPlayersForAI} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex border border-border p-1">
          <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('card')}>
            <LayoutGrid className="w-4 h-4 mr-2" />Cards
          </Button>
          <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
            <TableIcon className="w-4 h-4 mr-2" />Table
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-border flex items-center justify-center">
                <Trophy className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold tracking-tight">Filter Game History</h3>
                <p className="text-xs text-muted-foreground">
                  {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-2 block tracking-wide uppercase">Sport</label>
                <select value={selectedSport} onChange={(e) => onSportChange(e.target.value)}
                  className="w-full bg-card border border-border text-foreground px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="all">All Sports</option>
                  <option value="basketball">Basketball</option>
                  <option value="volleyball">Volleyball</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-2 block tracking-wide uppercase">Division</label>
                <select value={selectedDivision} onChange={(e) => onDivisionChange(e.target.value)}
                  className="w-full bg-card border border-border text-foreground px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                  {divisions.map(div => <option key={div} value={div}>{div === 'all' ? 'All Divisions' : div}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-2 block tracking-wide uppercase">Team</label>
                <select value={selectedTeam} onChange={(e) => onTeamChange(e.target.value)}
                  className="w-full bg-card border border-border text-foreground px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="all">All Teams</option>
                  {filteredTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredGames.length > 0 ? (
        viewMode === 'card' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map(game => <GameCard key={game.id} game={game} />)}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 text-[11px] font-medium text-muted-foreground tracking-wide uppercase">Date</th>
                      <th className="text-left py-3 px-4 text-[11px] font-medium text-muted-foreground tracking-wide uppercase">Match</th>
                      <th className="text-center py-3 px-4 text-[11px] font-medium text-muted-foreground tracking-wide uppercase">Sport</th>
                      <th className="text-center py-3 px-4 text-[11px] font-medium text-muted-foreground tracking-wide uppercase">Score</th>
                      <th className="text-center py-3 px-4 text-[11px] font-medium text-muted-foreground tracking-wide uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGames.map((game) => {
                      const homeTeam = teams.find(t => t.id === game.home_team_id);
                      const awayTeam = teams.find(t => t.id === game.away_team_id);
                      const isExpanded = expandedGame === game.id;
                      const { homeStats, awayStats } = isExpanded ? getGamePlayerStats(game.id, game.home_team_id, game.away_team_id) : { homeStats: [], awayStats: [] };
                      const homeBestPlayer = isExpanded ? getBestPlayerForTeam(game.id, game.home_team_id, game.sport) : null;
                      const awayBestPlayer = isExpanded ? getBestPlayerForTeam(game.id, game.away_team_id, game.sport) : null;

                      const topPlayersForAI = [];
                      if (homeBestPlayer) {
                        topPlayersForAI.push({
                          name: `${homeBestPlayer.player?.first_name} ${homeBestPlayer.player?.last_name}`,
                          team: homeTeam?.name,
                          stats: game.sport === 'basketball'
                            ? `${homeBestPlayer.stats.points} PTS, ${homeBestPlayer.stats.rebounds || 0} REB, ${homeBestPlayer.stats.assists || 0} AST`
                            : `${homeBestPlayer.stats.attacks || 0} ATK, ${homeBestPlayer.stats.blocks || 0} BLK, ${homeBestPlayer.stats.aces || 0} ACE`
                        });
                      }
                      if (awayBestPlayer) {
                        topPlayersForAI.push({
                          name: `${awayBestPlayer.player?.first_name} ${awayBestPlayer.player?.last_name}`,
                          team: awayTeam?.name,
                          stats: game.sport === 'basketball'
                            ? `${awayBestPlayer.stats.points} PTS, ${awayBestPlayer.stats.rebounds || 0} REB, ${awayBestPlayer.stats.assists || 0} AST`
                            : `${awayBestPlayer.stats.attacks || 0} ATK, ${awayBestPlayer.stats.blocks || 0} BLK, ${awayBestPlayer.stats.aces || 0} ACE`
                        });
                      }

                      return (
                        <React.Fragment key={game.id}>
                          <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="py-4 px-4 text-sm text-foreground tabular-nums">
                              {new Date(game.game_date).toLocaleDateString()}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {new Date(game.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-8 h-8 border border-border">
                                    <AvatarImage src={homeTeam?.logo_url} />
                                    <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                      {homeTeam?.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-foreground text-sm">{getTeamName(game.home_team_id)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-8 h-8 border border-border">
                                    <AvatarImage src={awayTeam?.logo_url} />
                                    <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                      {awayTeam?.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-foreground text-sm">{getTeamName(game.away_team_id)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Badge variant="outline" className="text-[11px] uppercase tracking-wide">{game.sport}</Badge>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="font-heading text-xl font-bold text-foreground tabular-nums">
                                {homeScore(game)} - {awayScore(game)}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Button size="sm" variant="outline"
                                onClick={() => { const next = isExpanded ? null : game.id; setExpandedGame(next); if (next) fetchStatsForGame(game.id); }}>
                                {isExpanded ? <><ChevronUp className="w-4 h-4 mr-1" />Hide</> : <><ChevronDown className="w-4 h-4 mr-1" />View</>}
                              </Button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="border-b border-border bg-muted/20">
                              <td colSpan="5" className="p-6">
                                <div className="space-y-6">
                                  <StatsStatus game={game} />
                                  <QuarterScores game={game} />
                                  {isAdmin && (
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="outline" onClick={() => forceRefreshStats(game.id)}>Force refresh stats</Button>
                                    </div>
                                  )}
                                  {!loadingGame && !statsError[game.id] && homeStats.length > 0 && awayStats.length > 0 && (
                                    <div className="grid md:grid-cols-2 gap-6">
                                      <TeamStatsBlock game={game} teamId={game.home_team_id} stats={homeStats} />
                                      <TeamStatsBlock game={game} teamId={game.away_team_id} stats={awayStats} />
                                    </div>
                                  )}
                                  {homeTeam && awayTeam && (
                                    <div className="mt-4">
                                      <AIGameSummary game={game} homeTeam={homeTeam} awayTeam={awayTeam} topPlayers={topPlayersForAI} />
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 border border-border flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-heading text-lg font-bold">No game history found</p>
          <p className="text-muted-foreground text-sm mt-2">Complete some games to see them here</p>
        </div>
      )}
    </div>
  );
}