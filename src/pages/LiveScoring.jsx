import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, PlayCircle, AlertTriangle, ChevronRight, Clock, TrendingUp, Target, Zap, Shield, RotateCcw, User, Eye, EyeOff, Flag, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import VoiceAssistant from "@/components/VoiceAssistant";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function LiveScoring() {
  const [game, setGame] = useState(null);
  const [currentQuarter, setCurrentQuarter] = useState(1);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [quarterScores, setQuarterScores] = useState([]);
  const [homeTimeouts, setHomeTimeouts] = useState(5);
  const [awayTimeouts, setAwayTimeouts] = useState(5);
  const [homeTeamFouls, setHomeTeamFouls] = useState(0);
  const [awayTeamFouls, setAwayTeamFouls] = useState(0);
  const [playerStats, setPlayerStats] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null); // 'home' or 'away'
  const [showQuarterEnd, setShowQuarterEnd] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);
  const [showQuarterStats, setShowQuarterStats] = useState(true);
  const [showDefaultDialog, setShowDefaultDialog] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [userRole, setUserRole] = useState('viewer'); // 'overall', 'home_stat', 'away_stat', 'viewer'
  const [activeTimeout, setActiveTimeout] = useState(null); // 'home' | 'away' | null
  const [voiceFeedback, setVoiceFeedback] = useState(null); // {text, status}
  const [undoInProgress, setUndoInProgress] = useState(false);
  const undoLockRef = useRef(false);
  const lastUndoTsRef = useRef(0);
  const lastCommandRef = useRef({ key: '', ts: 0 });
  const lastWriteTsRef = useRef(0);
  const allowDecreaseUntilRef = useRef(0);
  const homeScoreRef = useRef(0);
  const awayScoreRef = useRef(0);
  const lastGameUpdateAtRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadGame();
    loadUser();
    
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Set up periodic game state refresh for real-time sync
    const intervalId = setInterval(() => {
      if (game?.id) {
        refreshGameState();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [game?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep refs in sync with latest scores to avoid stale-closure issues in interval refresh
  useEffect(() => { homeScoreRef.current = homeScore; }, [homeScore]);
  useEffect(() => { awayScoreRef.current = awayScore; }, [awayScore]);

  // Real-time subscribe to this game's updates to avoid poll races across devices
  useEffect(() => {
    if (!game?.id) return;
    const unsubscribe = base44.entities.Game.subscribe((event) => {
      if (event.id !== game.id) return;
      if (event.type === 'update' || event.type === 'create') {
        const g = event.data;
        const srvAt = new Date(g.updated_date || Date.now()).getTime();
        if (srvAt + 1 < lastGameUpdateAtRef.current) return; // ignore stale/out-of-order updates
        lastGameUpdateAtRef.current = srvAt;
        setGame(g);
        const allowDec = Date.now() < allowDecreaseUntilRef.current;
        const srvHome = g.home_score || 0;
        const srvAway = g.away_score || 0;
        const nextHome = allowDec ? srvHome : Math.max(srvHome, homeScoreRef.current);
        const nextAway = allowDec ? srvAway : Math.max(srvAway, awayScoreRef.current);
        setHomeScore(nextHome);
        setAwayScore(nextAway);
        setCurrentQuarter(g.current_quarter || 1);
        setQuarterScores(g.quarter_scores || []);
        setHomeTimeouts(g.home_timeouts ?? 5);
        setAwayTimeouts(g.away_timeouts ?? 5);
        setHomeTeamFouls(g.home_team_fouls || 0);
        setAwayTeamFouls(g.away_team_fouls || 0);
      }
    });
    return unsubscribe;
  }, [game?.id]);

  // Real-time subscribe to player stats for immediate cross-device sync (including undos)
  useEffect(() => {
    if (!game?.id) return;
    const unsubscribe = base44.entities.PlayerGameStats.subscribe((event) => {
      const stat = event.data;
      if (!stat || stat.game_id !== game.id) return;
      const key = `${stat.player_id}_${stat.quarter}`;
      setPlayerStats((prev) => {
        const next = { ...prev };
        if (event.type === 'delete') {
          delete next[key];
        } else {
          next[key] = stat;
        }
        return next;
      });
    });
    return unsubscribe;
  }, [game?.id]);

  const refreshGameState = async () => {
    if (!game?.id) return;
    if (Date.now() - lastWriteTsRef.current < 1200) return;
    try {
      const games = await base44.entities.Game.filter({ id: game.id });
      const currentGame = games && games[0];
      if (currentGame) {
        const srvAt = new Date(currentGame.updated_date || Date.now()).getTime();
        if (srvAt + 1 < lastGameUpdateAtRef.current) return;
        lastGameUpdateAtRef.current = srvAt;
        setGame(currentGame);
        const allowDec = Date.now() < allowDecreaseUntilRef.current;
        const srvHome = currentGame.home_score || 0;
        const srvAway = currentGame.away_score || 0;
        const nextHome = allowDec ? srvHome : Math.max(srvHome, homeScoreRef.current);
        const nextAway = allowDec ? srvAway : Math.max(srvAway, awayScoreRef.current);
        setHomeScore(nextHome);
        setAwayScore(nextAway);
        setCurrentQuarter(currentGame.current_quarter || 1);
        setQuarterScores(currentGame.quarter_scores || []);
        setHomeTimeouts(currentGame.home_timeouts ?? 5);
        setAwayTimeouts(currentGame.away_timeouts ?? 5);
        setHomeTeamFouls(currentGame.home_team_fouls || 0);
        setAwayTeamFouls(currentGame.away_team_fouls || 0);
      }
    } catch (error) {
      console.error("Error refreshing game state:", error);
    }
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  // Determine user role for basketball games
  useEffect(() => {
    if (!user || !game) return;
    if (user.role === 'admin') { setUserRole('overall'); return; }
    if (game.sport === 'basketball') {
      const u = user.email?.toLowerCase();
      const overall = game.overall_scorekeeper_email?.toLowerCase();
      const home = game.home_statistician_email?.toLowerCase();
      const away = game.away_statistician_email?.toLowerCase();
      if (overall && u && overall === u) setUserRole('overall');
      else if (home && u && home === u) setUserRole('home_stat');
      else if (away && u && away === u) setUserRole('away_stat');
      else setUserRole('viewer');
    } else {
      setUserRole('overall');
    }
  }, [user, game]);

  const loadGame = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game_id');
    if (!gameId) {
      navigate(createPageUrl("Games"));
      return;
    }

    const games = await base44.entities.Game.filter({ id: gameId });
    const currentGame = games && games[0];
    if (!currentGame) {
      navigate(createPageUrl("Games"));
      return;
    }

    setGame(currentGame);
    lastGameUpdateAtRef.current = new Date(currentGame.updated_date || Date.now()).getTime();
    setHomeScore(currentGame.home_score || 0);
    setAwayScore(currentGame.away_score || 0);
    setCurrentQuarter(currentGame.current_quarter || 1);
    setQuarterScores(currentGame.quarter_scores || []);
    setHomeTimeouts(currentGame.home_timeouts ?? 5);
    setAwayTimeouts(currentGame.away_timeouts ?? 5);
    setHomeTeamFouls(currentGame.home_team_fouls || 0);
    setAwayTeamFouls(currentGame.away_team_fouls || 0);
    
    if (currentGame.status === 'scheduled') {
      await base44.entities.Game.update(gameId, { status: 'in_progress' });
    }

    const stats = await base44.entities.PlayerGameStats.filter({ game_id: gameId });
    const statsMap = {};
    stats.forEach(stat => {
      const key = `${stat.player_id}_${stat.quarter}`;
      statsMap[key] = stat;
    });
    setPlayerStats(statsMap);
  };

  const { data: homeTeam } = useQuery({
    queryKey: ['team', game?.home_team_id],
    queryFn: async () => {
      const teams = await base44.entities.Team.list();
      return teams.find(t => t.id === game?.home_team_id);
    },
    enabled: !!game?.home_team_id,
    refetchInterval: 5000,
  });

  const { data: awayTeam } = useQuery({
    queryKey: ['team', game?.away_team_id],
    queryFn: async () => {
      const teams = await base44.entities.Team.list();
      return teams.find(t => t.id === game?.away_team_id);
    },
    enabled: !!game?.away_team_id,
    refetchInterval: 5000,
  });

  const { data: homePlayers = [] } = useQuery({
    queryKey: ['players', game?.home_team_id],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => p.team_id === game?.home_team_id);
    },
    enabled: !!game?.home_team_id,
    refetchInterval: 10000,
  });

  const { data: awayPlayers = [] } = useQuery({
    queryKey: ['players', game?.away_team_id],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => p.team_id === game?.away_team_id);
    },
    enabled: !!game?.away_team_id,
    refetchInterval: 10000,
  });

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === user?.organization_id);
    },
    enabled: !!user?.organization_id,
  });

  const getPlayerStatKey = (playerId, quarter = currentQuarter) => `${playerId}_${quarter}`;

  const getPlayerStat = (playerId, statType) => {
    let total = 0;
    for (let q = 1; q <= currentQuarter; q++) {
      const key = `${playerId}_${q}`;
      total += playerStats[key]?.[statType] || 0;
    }
    return total;
  };

  const getCurrentQuarterPlayerStat = (playerId, statType) => {
    const key = `${playerId}_${currentQuarter}`;
    return playerStats[key]?.[statType] || 0;
  };

  const getTotalPlayerFouls = (playerId) => {
    let totalFouls = 0;
    for (let q = 1; q <= currentQuarter; q++) {
      const key = `${playerId}_${q}`;
      totalFouls += playerStats[key]?.fouls || 0;
    }
    return totalFouls;
  };

  const updatePlayerStats = async (playerId, teamId, statUpdates, quarter = currentQuarter) => {
    const key = getPlayerStatKey(playerId, quarter);
    let statToPersist = null; 

    setPlayerStats(prev => {
      const existingStat = prev[key] || {};
      const newStatData = {
        ...existingStat,
        game_id: game.id,
        player_id: playerId,
        team_id: teamId,
        quarter: quarter,
      };

      statUpdates.forEach(({ statType, value }) => {
        newStatData[statType] = Math.max(0, (newStatData[statType] || 0) + value);
      });
      
      statToPersist = newStatData;

      return {
        ...prev,
        [key]: newStatData,
      };
    });

    try {
      lastWriteTsRef.current = Date.now();
      // Ensure we use existing DB row if present (prevents duplicates on rapid actions/undo)
      if (!statToPersist.id) {
        const existing = await base44.entities.PlayerGameStats.filter({
          game_id: game.id,
          player_id: playerId,
          team_id: teamId,
          quarter: quarter,
        });
        if (existing && existing[0]?.id) {
          statToPersist.id = existing[0].id;
        }
      }

      if (statToPersist.id) {
        await base44.entities.PlayerGameStats.update(statToPersist.id, statToPersist);
      } else {
        const created = await base44.entities.PlayerGameStats.create(statToPersist);
        setPlayerStats(prev => ({
          ...prev,
          [key]: { ...prev[key], id: created.id },
        }));
      }
    } catch (error) {
      console.error("Error saving player stats:", error);
    }
  };

  // Updated addPoints to accept playerId and teamId
  const addPoints = async (playerId, teamId, points) => {
    // Only overall scorekeeper can add points for basketball
    if (game.sport === 'basketball' && userRole !== 'overall') {
      alert("Only the Overall Scorekeeper can add points.");
      return;
    }
    if (undoInProgress) return; // prevent race with undo
    // throttle duplicate rapid clicks (300ms)
    if (!addPoints.lastTs) addPoints.lastTs = 0;
    const now = Date.now();
    if (now - addPoints.lastTs < 300) return;
    addPoints.lastTs = now;

    const oldHomeScore = homeScore;
    const oldAwayScore = awayScore;

    const isHomeTeam = teamId === game.home_team_id;
    const newHomeScore = isHomeTeam ? homeScore + points : homeScore;
    const newAwayScore = !isHomeTeam ? awayScore + points : awayScore;

    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);
    
    const statUpdates = [
      { statType: 'points', value: points }
    ];

    // Prepend a quarter snapshot of cumulative score to avoid stale calcs during undo across quarter boundaries
    // (no DB write, used only by actionHistory logic)
    const snapshot = { quarter: currentQuarter, homeScoreSnapshot: newHomeScore, awayScoreSnapshot: newAwayScore };
    
    if (points === 3) {
      statUpdates.push(
        { statType: 'three_pointers', value: 1 },
        { statType: 'field_goals_made', value: 1 },
        { statType: 'field_goals_attempted', value: 1 }
      );
    } else if (points === 2) {
      statUpdates.push(
        { statType: 'field_goals_made', value: 1 },
        { statType: 'field_goals_attempted', value: 1 }
      );
    } else if (points === 1) {
      statUpdates.push(
        { statType: 'free_throws_made', value: 1 },
        { statType: 'free_throws_attempted', value: 1 }
      );
    }

    await updatePlayerStats(playerId, teamId, statUpdates);

    lastWriteTsRef.current = Date.now();
    const scorePayload = isHomeTeam ? { home_score: newHomeScore } : { away_score: newAwayScore };
    await base44.entities.Game.update(game.id, scorePayload);
    lastGameUpdateAtRef.current = Date.now();

    setActionHistory(prev => [...prev, {
      type: 'score',
      team: isHomeTeam ? 'home' : 'away',
      points: points,
      playerId: playerId,
      quarter: currentQuarter,
      oldHomeScore: oldHomeScore,
      oldAwayScore: oldAwayScore,
      statUpdates: statUpdates,
      snapshot,
    }]);
  };

  // Updated addPlayerStat to accept playerId and teamId
  const addPlayerStat = async (playerId, teamId, statType, value) => {
    // Permission checks for basketball
    if (game.sport === 'basketball') {
      const isHomeTeam = teamId === game.home_team_id;
      if (userRole === 'viewer') {
        alert("You don't have permission to record stats.");
        return;
      }
      if (userRole === 'home_stat' && !isHomeTeam) {
        alert("Home Team Statistician can only record stats for Home team players.");
        return;
      }
      if (userRole === 'away_stat' && isHomeTeam) {
        alert("Away Team Statistician can only record stats for Away team players.");
        return;
      }
    }
    if (undoInProgress) return;
    if (!addPlayerStat.lastTs) addPlayerStat.lastTs = 0;
    {
      const now = Date.now();
      if (now - addPlayerStat.lastTs < 200) return;
      addPlayerStat.lastTs = now;
    }
    const statUpdates = [{ statType, value }];
    await updatePlayerStats(playerId, teamId, statUpdates);
    
    setActionHistory(prev => [...prev, {
      type: statType,
      playerId: playerId,
      teamId: teamId,
      quarter: currentQuarter,
      value: value,
      statUpdates: statUpdates,
    }]);
  };

  // Updated handleFoul to accept playerId and teamId
  const handleFoul = async (playerId, teamId) => {
    // Only overall scorekeeper can manage fouls for basketball
    if (game.sport === 'basketball' && userRole !== 'overall') {
      alert("Only the Overall Scorekeeper can manage fouls.");
      return;
    }
    if (undoInProgress) return;
    const isHomeTeam = teamId === game.home_team_id;
    const currentTeam = isHomeTeam ? 'home' : 'away';
    const oldTeamFouls = isHomeTeam ? homeTeamFouls : awayTeamFouls;
    
    const statUpdates = [{ statType: 'fouls', value: 1 }];
    await updatePlayerStats(playerId, teamId, statUpdates);
    
    const newTeamFouls = oldTeamFouls + 1;
    if (isHomeTeam) {
      setHomeTeamFouls(newTeamFouls);
      lastWriteTsRef.current = Date.now();
      await base44.entities.Game.update(game.id, { home_team_fouls: newTeamFouls });
    } else {
      setAwayTeamFouls(newTeamFouls);
      lastWriteTsRef.current = Date.now();
      await base44.entities.Game.update(game.id, { away_team_fouls: newTeamFouls });
    }

    setActionHistory(prev => [...prev, {
      type: 'foul',
      playerId: playerId,
      teamId: teamId,
      quarter: currentQuarter,
      team: currentTeam,
      oldTeamFouls: oldTeamFouls,
      statUpdates: statUpdates,
    }]);

    const totalFouls = getTotalPlayerFouls(playerId) + 1;
    if (totalFouls >= game.player_foul_limit) {
      alert(`⚠️ Player has reached foul limit (${game.player_foul_limit} fouls) and is disqualified!`);
      // Keeping player selected visually, but interaction is disabled by PlayerRow component
    } else if (totalFouls === game.player_foul_limit - 1) {
      alert(`⚠️ Warning: Player has ${totalFouls} fouls! One more foul and they will be disqualified.`);
    }
  };

  const useTimeout = async (team) => {
    // Only overall scorekeeper can manage timeouts for basketball
    if (game.sport === 'basketball' && userRole !== 'overall') {
      alert("Only the Overall Scorekeeper can manage timeouts.");
      return;
    }
    const oldHomeTimeouts = homeTimeouts;
    const oldAwayTimeouts = awayTimeouts;

    // Visual indicator for active timeout (auto-clear after 60s)
    setActiveTimeout(team);
    setTimeout(() => setActiveTimeout((prev) => (prev === team ? null : prev)), 60000);

    if (team === 'home' && homeTimeouts > 0) {
      const newTimeouts = homeTimeouts - 1;
      setHomeTimeouts(newTimeouts);
      lastWriteTsRef.current = Date.now();
      await base44.entities.Game.update(game.id, { home_timeouts: newTimeouts });
      setActionHistory(prev => [...prev, {
        type: 'timeout',
        team: 'home',
        quarter: currentQuarter,
        oldTimeouts: oldHomeTimeouts,
      }]);
    } else if (team === 'away' && awayTimeouts > 0) {
      const newTimeouts = awayTimeouts - 1;
      setAwayTimeouts(newTimeouts);
      lastWriteTsRef.current = Date.now();
      await base44.entities.Game.update(game.id, { away_timeouts: newTimeouts });
      setActionHistory(prev => [...prev, {
        type: 'timeout',
        team: 'away',
        quarter: currentQuarter,
        oldTimeouts: oldAwayTimeouts,
      }]);
    }
  };

  const handleUndo = async () => {
    // Only overall scorekeeper can undo for basketball
    if (game.sport === 'basketball' && userRole !== 'overall') {
      alert("Only the Overall Scorekeeper can undo actions.");
      return;
    }
    if (actionHistory.length === 0) return;
    const now = Date.now();
    if (now - lastUndoTsRef.current < 1500) return; // throttle rapid undos
    lastUndoTsRef.current = now;
    if (undoLockRef.current) return;
    undoLockRef.current = true;
    setUndoInProgress(true);
    // Allow legitimate decreases from server for a short window (undo)
    allowDecreaseUntilRef.current = Date.now() + 4000;

    try {
      const lastAction = actionHistory[actionHistory.length - 1];
      setActionHistory(prev => prev.slice(0, -1));

    if (lastAction.type === 'score') {
      setHomeScore(lastAction.oldHomeScore);
      setAwayScore(lastAction.oldAwayScore);
      lastWriteTsRef.current = Date.now();

      const scoreUndoPayload = lastAction.team === 'home'
        ? { home_score: lastAction.oldHomeScore }
        : { away_score: lastAction.oldAwayScore };

      const reverseUpdates = lastAction.statUpdates.map(update => ({
        statType: update.statType,
        value: -update.value,
      }));
      const teamId = lastAction.team === 'home' ? game.home_team_id : game.away_team_id;

      await Promise.all([
        base44.entities.Game.update(game.id, scoreUndoPayload),
        updatePlayerStats(lastAction.playerId, teamId, reverseUpdates, lastAction.quarter),
      ]);
      lastGameUpdateAtRef.current = Date.now();

    } else if (lastAction.type === 'foul') {
      // Undo player foul + team foul in parallel
      const reverseUpdates = lastAction.statUpdates.map(update => ({
        statType: update.statType,
        value: -update.value,
      }));

      const teamPayload = lastAction.team === 'home'
        ? { home_team_fouls: lastAction.oldTeamFouls }
        : { away_team_fouls: lastAction.oldTeamFouls };

      if (lastAction.team === 'home') {
        setHomeTeamFouls(lastAction.oldTeamFouls);
      } else {
        setAwayTeamFouls(lastAction.oldTeamFouls);
      }
      lastWriteTsRef.current = Date.now();

      await Promise.all([
        updatePlayerStats(lastAction.playerId, lastAction.teamId, reverseUpdates, lastAction.quarter),
        base44.entities.Game.update(game.id, teamPayload),
      ]);
      lastGameUpdateAtRef.current = Date.now();

    } else if (['rebounds', 'assists', 'steals', 'blocks'].includes(lastAction.type)) {
      const reverseUpdates = lastAction.statUpdates.map(update => ({
        statType: update.statType,
        value: -update.value
      }));
      
      await updatePlayerStats(lastAction.playerId, lastAction.teamId, reverseUpdates, lastAction.quarter);

    } else if (lastAction.type === 'timeout') {
      const payload = lastAction.team === 'home'
        ? { home_timeouts: lastAction.oldTimeouts }
        : { away_timeouts: lastAction.oldTimeouts };

      if (lastAction.team === 'home') {
        setHomeTimeouts(lastAction.oldTimeouts);
      } else {
        setAwayTimeouts(lastAction.oldTimeouts);
      }
      lastWriteTsRef.current = Date.now();

      await base44.entities.Game.update(game.id, payload);
    }
    } finally {
      undoLockRef.current = false;
      setUndoInProgress(false);
    }
  };

  const endQuarter = async () => {
    // Only overall scorekeeper can end quarters for basketball
    if (game.sport === 'basketball' && userRole !== 'overall') {
      alert("Only the Overall Scorekeeper can end quarters.");
      return;
    }
    // Calculate the score for THIS QUARTER ONLY by subtracting previous quarters' scores
    const previousHomeTotalScore = quarterScores.reduce((sum, q) => sum + q.home, 0);
    const previousAwayTotalScore = quarterScores.reduce((sum, q) => sum + q.away, 0);
    
    const quarterScore = {
      quarter: currentQuarter,
      home: homeScore - previousHomeTotalScore,
      away: awayScore - previousAwayTotalScore,
    };

    const newQuarterScores = (() => {
      const idx = quarterScores.findIndex(q => q.quarter === currentQuarter);
      const updated = [...quarterScores];
      if (idx >= 0) updated[idx] = quarterScore; else updated.push(quarterScore);
      return updated;
    })();
    setQuarterScores(newQuarterScores);
    setHomeTeamFouls(0);
    setAwayTeamFouls(0);

    const nextQuarter = currentQuarter + 1;
    const newOvertimeCount = nextQuarter > 4 ? (nextQuarter - 4) : 0;

    lastWriteTsRef.current = Date.now();
    await base44.entities.Game.update(game.id, {
      quarter_scores: newQuarterScores,
      current_quarter: nextQuarter,
      home_team_fouls: 0,
      away_team_fouls: 0,
      overtime_count: newOvertimeCount,
      home_score: homeScore,
      away_score: awayScore,
    });

    setCurrentQuarter(nextQuarter);

    // Clear per-quarter UI state and selection
    setShowQuarterEnd(false);
    setActionHistory([]);

    // Delay refresh slightly to avoid stale read after update
    setTimeout(() => { refreshGameState(); }, 800);
  };

  const endGame = async () => {
    // Only overall scorekeeper can end game for basketball
    if (game.sport === 'basketball' && userRole !== 'overall') {
      alert("Only the Overall Scorekeeper can end the game.");
      return;
    }
    if (homeScore === awayScore && currentQuarter >= 4) {
      alert("Game is tied! Please play overtime period.");
      return;
    }

    // Fetch fresh team data to ensure we have latest wins/losses
    const allTeams = await base44.entities.Team.list();
    const home = allTeams.find(t => t.id === game.home_team_id);
    const away = allTeams.find(t => t.id === game.away_team_id);

    if (!home || !away) {
      alert("Error: Unable to find team data. Please try again.");
      return;
    }

    await base44.entities.Game.update(game.id, {
      status: 'completed',
      home_score: homeScore,
      away_score: awayScore,
    });

    if (homeScore > awayScore) {
      await base44.entities.Team.update(game.home_team_id, {
        wins: (home.wins || 0) + 1
      });
      
      await base44.entities.Team.update(game.away_team_id, {
        losses: (away.losses || 0) + 1
      });
    } else {
      await base44.entities.Team.update(game.home_team_id, {
        losses: (home.losses || 0) + 1
      });
      
      await base44.entities.Team.update(game.away_team_id, {
        wins: (away.wins || 0) + 1
      });
    }

    // Find best player (highest points)
    const allPlayersInGame = [...homePlayers, ...awayPlayers];
    let bestPlayer = null;
    let bestPoints = 0;
    
    allPlayersInGame.forEach(player => {
      const points = getPlayerStat(player.id, 'points');
      if (points > bestPoints) {
        bestPoints = points;
        bestPlayer = player;
      }
    });

    const winningTeam = homeScore > awayScore ? homeTeam : awayTeam;

    // Create notification for all org members
    await base44.entities.Notification.create({
      organization_id: game.organization_id,
      type: "game_completed",
      title: "Game Completed! 🏀",
      message: `${homeTeam.name} vs ${awayTeam.name} - Final Score: ${homeScore}-${awayScore}. ${winningTeam.name} wins!`,
      data: {
        game_id: game.id,
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        homeScore: homeScore,
        awayScore: awayScore,
        score: true,
        winner: winningTeam.name,
        bestPlayer: bestPlayer ? `${bestPlayer.first_name} ${bestPlayer.last_name} (${bestPoints} PTS)` : null
      },
      read_by: []
    });

    navigate(createPageUrl("Games"));
  };

  const handleDeclareDefault = async (defaultedTeamId) => {
    // Only overall scorekeeper can declare default for basketball
    if (game.sport === 'basketball' && userRole !== 'overall') {
      alert("Only the Overall Scorekeeper can declare a default.");
      return;
    }
    const winningTeamId = defaultedTeamId === game.home_team_id ? game.away_team_id : game.home_team_id;
    const newHomeScore = defaultedTeamId === game.home_team_id ? 0 : 20;
    const newAwayScore = defaultedTeamId === game.away_team_id ? 0 : 20;

    // Allow server-side score change (may decrease for defaulted team)
    allowDecreaseUntilRef.current = Date.now() + 4000;

    await base44.entities.Game.update(game.id, {
      status: 'completed',
      home_score: newHomeScore,
      away_score: newAwayScore,
      is_default: true,
      defaulted_team_id: defaultedTeamId,
      winning_team_id: winningTeamId,
    });

    const allTeams = await base44.entities.Team.list();
    const winningTeam = allTeams.find(t => t.id === winningTeamId);
    const defaultedTeam = allTeams.find(t => t.id === defaultedTeamId);

    await base44.entities.Team.update(winningTeamId, {
      wins: (winningTeam.wins || 0) + 1
    });

    await base44.entities.Team.update(defaultedTeamId, {
      losses: (defaultedTeam.losses || 0) + 1
    });

    setShowDefaultDialog(false);
    navigate(createPageUrl("Games"));
  };

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

  const handleUndoDefault = async () => {
    // Only overall scorekeeper can undo default for basketball
    if (game.sport === 'basketball' && userRole !== 'overall') {
      alert("Only the Overall Scorekeeper can undo a default.");
      return;
    }
    if (!game.is_default) return;

    // Allow server-side decrease to 0-0 during undo default
    allowDecreaseUntilRef.current = Date.now() + 4000;

    const allTeams = await base44.entities.Team.list();
    const winningTeam = allTeams.find(t => t.id === game.winning_team_id);
    const defaultedTeam = allTeams.find(t => t.id === game.defaulted_team_id);

    await base44.entities.Team.update(game.winning_team_id, {
      wins: Math.max(0, (winningTeam.wins || 0) - 1)
    });

    await base44.entities.Team.update(game.defaulted_team_id, {
      losses: Math.max(0, (defaultedTeam.losses || 0) - 1)
    });

    await base44.entities.Game.update(game.id, {
      status: 'in_progress',
      home_score: 0,
      away_score: 0,
      is_default: false,
      defaulted_team_id: null,
      winning_team_id: null,
    });

    await loadGame();
  };

  // New voice command handler
  const handleVoiceCommand = async ({ team, player, action, value }) => {
    if (!showVoiceAssistant) return; // ignore commands when assistant is hidden
    const key = `${action}|${team}|${player?.id || ''}|${value || ''}`;
    const nowCmd = Date.now();
    if (lastCommandRef.current.key === key && nowCmd - lastCommandRef.current.ts < 1500) return; // dedupe rapid repeats
    lastCommandRef.current = { key, ts: nowCmd };
    const summary = `${team || ''} #${player?.jersey_number || ''} ${action}${value ? ' ' + value : ''}`.trim();
    setVoiceFeedback({ text: summary, status: 'processing' });

    // Handle undo command
    if (action === 'undo') {
      setVoiceFeedback({ text: 'Voice undo disabled — use the UNDO button', status: 'error' });
      return;
    }
    
    if (!game || !player) {
      setVoiceFeedback({ text: 'Game or player not found', status: 'error' });
      return;
    }

    try {
      const teamId = team === 'home' ? game.home_team_id : game.away_team_id;
      
      // Select the player and team for UI highlight
      setSelectedPlayer(player);
      setSelectedTeam(team);

      // Execute the action based on the command
      if (action === '3-pointer') {
        await addPoints(player.id, teamId, 3);
      } else if (action === '2-pointer') {
        await addPoints(player.id, teamId, 2);
      } else if (action === 'free-throw') {
        await addPoints(player.id, teamId, 1);
      } else if (action === 'foul') {
        await handleFoul(player.id, teamId);
      } else if (action === 'rebound') {
        await addPlayerStat(player.id, teamId, 'rebounds', 1);
      } else if (action === 'assist') {
        await addPlayerStat(player.id, teamId, 'assists', 1);
      } else if (action === 'steal') {
        await addPlayerStat(player.id, teamId, 'steals', 1);
      } else if (action === 'block') {
        await addPlayerStat(player.id, teamId, 'blocks', 1);
      }
      
      setVoiceFeedback({ text: summary, status: 'success' });
    } catch (error) {
      console.error('Error executing voice command:', error);
      setVoiceFeedback({ text: error.message || 'Command failed', status: 'error' });
    }
  };

  if (!game || !homeTeam || !awayTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  const quarterLabel = currentQuarter <= 4 ? `Q${currentQuarter}` : `OT${currentQuarter - 4}`;
  const inPenalty = (team) => {
    return (team === 'home' ? homeTeamFouls : awayTeamFouls) >= game.penalty_limit_per_quarter;
  };

  // Roles available to this user for this game (basketball)
  const allowedRoles = [];
  const uEmail = user?.email?.toLowerCase();
  if (user?.role === 'admin' || game?.overall_scorekeeper_email?.toLowerCase() === uEmail) allowedRoles.push('overall');
  if (user?.role === 'admin' || game?.home_statistician_email?.toLowerCase() === uEmail) allowedRoles.push('home_stat');
  if (user?.role === 'admin' || game?.away_statistician_email?.toLowerCase() === uEmail) allowedRoles.push('away_stat');

  const PlayerRow = ({ player, team, teamId, onSelect }) => {
    const totalFouls = getTotalPlayerFouls(player.id);
    const points = getPlayerStat(player.id, 'points');
    const rebounds = getPlayerStat(player.id, 'rebounds');
    const assists = getPlayerStat(player.id, 'assists');
    const steals = getPlayerStat(player.id, 'steals');
    const blocks = getPlayerStat(player.id, 'blocks');
    const isFouledOut = totalFouls >= game.player_foul_limit;
    const isSelected = selectedPlayer?.id === player.id;
    
    // Determine if player can be selected based on role
    const isHomePlayer = teamId === game.home_team_id;
    const canSelectPlayer = game.sport !== 'basketball' || 
      userRole === 'overall' || 
      (userRole === 'home_stat' && isHomePlayer) || 
      (userRole === 'away_stat' && !isHomePlayer);
    const isDisabledByRole = !canSelectPlayer;

    return (
      <button
        onClick={() => {
          if (isFouledOut || isDisabledByRole) return;
          onSelect(player, team);
        }}
        className={`w-full text-left border-2 rounded-lg p-3 mb-2 transition-all ${
          isFouledOut || isDisabledByRole
            ? 'bg-gray-100 dark:bg-gray-900/50 opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-700' 
            : isSelected
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-400 ring-2 ring-orange-300 shadow-lg scale-105'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md'
        }`}
        disabled={isFouledOut || isDisabledByRole}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
              <AvatarImage src={player.photo_url} />
              <AvatarFallback className={`text-sm font-black ${isSelected ? 'bg-white text-orange-600' : 'bg-gradient-to-br from-orange-600 to-orange-700 text-white'}`}>
                {player.jersey_number}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                #{player.jersey_number} {player.first_name} {player.last_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className={`flex gap-3 ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              <div className="text-center">
                <div className="text-xl font-black">{points}</div>
                <div className={`text-[9px] font-semibold ${isSelected ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>PTS</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black">{rebounds}</div>
                <div className={`text-[9px] font-semibold ${isSelected ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>REB</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black">{assists}</div>
                <div className={`text-[9px] font-semibold ${isSelected ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>AST</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black">{steals}</div>
                <div className={`text-[9px] font-semibold ${isSelected ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>STL</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black">{blocks}</div>
                <div className={`text-[9px] font-semibold ${isSelected ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>BLK</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-black ${totalFouls >= game.player_foul_limit - 1 ? 'text-red-600 dark:text-red-400' : ''}`}>{totalFouls}</div>
                <div className={`text-[9px] font-semibold ${isSelected ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>FL</div>
              </div>
            </div>
            {isFouledOut && (
              <Badge className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5">FOULED OUT</Badge>
            )}
          </div>
        </div>
      </button>
    );
  };

  const handlePlayerSelect = (player, team) => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  const getPlayerRenderKey = (playerId) => {
    const points = getPlayerStat(playerId, 'points');
    const rebounds = getPlayerStat(playerId, 'rebounds');
    const assists = getPlayerStat(playerId, 'assists');
    const steals = getPlayerStat(playerId, 'steals');
    const blocks = getPlayerStat(playerId, 'blocks');
    const fouls = getTotalPlayerFouls(playerId);
    return `${playerId}_${points}_${rebounds}_${assists}_${steals}_${blocks}_${fouls}_${currentQuarter}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:via-orange-900/20 dark:to-gray-900">
      {/* TOP NAVIGATION BAR */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization?.logo_url && (
              <Avatar className="w-10 h-10 border-2 border-orange-500 shadow-lg">
                <AvatarImage src={organization.logo_url} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-sm">
                  {organization.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h1 className="text-lg font-black text-gray-900 dark:text-white">{organization?.name || 'Live Scoring'}</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Basketball Game Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleDarkMode}
              variant="outline"
              size="sm"
              className="border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-bold p-2"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Dashboard"))}
              variant="outline"
              size="sm"
              className="border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-bold"
            >
              <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* DEFAULT GAME ALERT */}
      {game.is_default && (
        <div className="sticky z-40 bg-red-100 dark:bg-red-900/95 border-b-4 border-red-500" style={{ top: '64px' }}>
          <div className="max-w-7xl mx-auto p-4">
            <Alert className="bg-red-200 dark:bg-red-800/50 border-2 border-red-400">
              <Flag className="h-5 w-5 text-red-600 dark:text-red-300" />
              <AlertDescription className="text-red-900 dark:text-red-100 font-bold flex items-center justify-between">
                <span>⚠️ This game ended by DEFAULT. {game.defaulted_team_id === homeTeam.id ? homeTeam.name : awayTeam.name} defaulted. Final Score: {game.home_score}-{game.away_score}</span>
                <Button
                  onClick={handleUndoDefault}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold ml-4"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Undo Default
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Main Scoreboard */}
      <div className="sticky z-40 bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100 dark:from-gray-900 dark:via-orange-900 dark:to-gray-900 border-b-4 border-orange-500 shadow-2xl" style={{ top: game.is_default ? '164px' : '64px' }}>
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
            <Badge className="bg-red-600 text-white border-2 border-red-400 px-6 py-2 text-base font-black shadow-lg">
              <PlayCircle className="w-5 h-5 mr-2 animate-pulse" />
              LIVE - {quarterLabel}
            </Badge>
            <Badge className="bg-orange-600 text-white border-2 border-orange-400 px-4 py-2 text-sm font-black">
              BASKETBALL
            </Badge>
            <Badge className="bg-purple-600 text-white border-2 border-purple-400 px-4 py-2 text-sm font-black">
              {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR SEASON'}
            </Badge>
            {game.sport === 'basketball' && (
              <Badge className={`px-4 py-2 text-sm font-black border-2 ${
                userRole === 'overall' ? 'bg-green-600 text-white border-green-400' :
                userRole === 'home_stat' ? 'bg-orange-600 text-white border-orange-400' :
                userRole === 'away_stat' ? 'bg-blue-600 text-white border-blue-400' :
                'bg-gray-600 text-white border-gray-400'
              }`}>
                {userRole === 'overall' ? '🎮 OVERALL SCOREKEEPER' :
                 userRole === 'home_stat' ? '📊 HOME STATISTICIAN' :
                 userRole === 'away_stat' ? '📊 AWAY STATISTICIAN' :
                 '👁 VIEWER'}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 items-center mb-4">
            {/* HOME TEAM */}
            <div className="text-center">
              <div className="text-orange-600 dark:text-orange-400 text-sm font-black mb-2">HOME</div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Avatar className="w-16 h-16 border-4 border-orange-400 shadow-2xl">
                  <AvatarImage src={homeTeam.logo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-lg">
                    {homeTeam.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-gray-900 dark:text-white text-2xl font-black text-left">{homeTeam.name}</div>
              </div>
              <div className="text-orange-600 dark:text-orange-500 text-7xl font-black mb-2">{homeScore}</div>
              <div className="flex justify-center gap-4 text-xs font-bold items-center">
                <span className={`${inPenalty('home') ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  FOULS: {homeTeamFouls}/{game.penalty_limit_per_quarter}
                </span>
                <span className="text-gray-900 dark:text-white">TO: {homeTimeouts}</span>
                {activeTimeout === 'home' && (
                  <span className="ml-2 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-black animate-pulse">TIMEOUT</span>
                )}
              </div>
            </div>

            {/* QUARTER SCORES */}
            <div className="text-center">
              <div className="text-gray-900 dark:text-white text-2xl font-black mb-3">{quarterLabel}</div>
              <div className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border-2 border-orange-300 dark:border-transparent">
                <div className="flex justify-center gap-3 flex-wrap">
                  {[1, 2, 3, 4].map(q => {
                    const qScore = quarterScores.find(qs => qs.quarter === q);
                    return (
                      <div key={q} className="text-base font-black text-gray-900 dark:text-white">
                        <span className="text-gray-600 dark:text-gray-400">Q{q}:</span> {qScore ? `${qScore.home}-${qScore.away}` : '-'}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* BUTTONS */}
              <div className="flex gap-2 justify-center flex-wrap">
                {!game.is_default && game.status === 'in_progress' && (
                  <Button
                    onClick={() => setShowDefaultDialog(true)}
                    size="sm"
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-xs px-4 py-2"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    DEFAULT
                  </Button>
                )}
                {currentQuarter <= 4 && (
                  <Button
                    onClick={() => setShowQuarterEnd(true)}
                    size="sm"
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-black text-xs px-4 py-2"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    END {quarterLabel}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {currentQuarter > 4 && (
                  <Button
                    onClick={() => setShowQuarterEnd(true)}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-black text-xs px-4 py-2"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    END {quarterLabel}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {currentQuarter >= 4 && homeScore !== awayScore && (
                  <Button
                    onClick={endGame}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black text-xs px-4 py-2"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    END GAME
                  </Button>
                )}
                {currentQuarter === 4 && homeScore === awayScore && (
                  <Button
                    onClick={() => setShowQuarterEnd(true)}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-black text-xs px-4 py-2"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    START OT
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                <Button
                  onClick={handleUndo}
                  size="sm"
                  className="bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-xs px-4 py-2 disabled:opacity-50"
                  disabled={undoInProgress || actionHistory.length === 0 || (game.sport === 'basketball' && userRole !== 'overall')}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  UNDO
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl("Games"))}
                  variant="outline"
                  size="sm"
                  className="border-2 border-gray-400 text-white hover:bg-gray-700 font-black text-xs px-4 py-2"
                >
                  CANCEL
                </Button>
              </div>
            </div>

            {/* AWAY TEAM */}
            <div className="text-center">
              <div className="text-blue-600 dark:text-blue-400 text-sm font-black mb-2">AWAY</div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="text-gray-900 dark:text-white text-2xl font-black text-right">{awayTeam.name}</div>
                <Avatar className="w-16 h-16 border-4 border-blue-400 shadow-2xl">
                  <AvatarImage src={awayTeam.logo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-lg">
                    {awayTeam.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-blue-600 dark:text-blue-500 text-7xl font-black mb-2">{awayScore}</div>
              <div className="flex justify-center gap-4 text-xs font-bold items-center">
                <span className={`${inPenalty('away') ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  FOULS: {awayTeamFouls}/{game.penalty_limit_per_quarter}
                </span>
                <span className="text-gray-900 dark:text-white">TO: {awayTimeouts}</span>
                {activeTimeout === 'away' && (
                  <span className="ml-2 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-black animate-pulse">TIMEOUT</span>
                )}
              </div>
            </div>
          </div>

          {/* ALERTS */}
          {currentQuarter >= 4 && homeScore === awayScore && (
            <Alert className="bg-yellow-900/50 border-2 border-yellow-500 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <AlertDescription className="text-yellow-200 font-bold text-center">
                ⚠️ Game is TIED! Must play overtime period.
              </AlertDescription>
            </Alert>
          )}

          {(inPenalty('home') || inPenalty('away')) && (
            <Alert className="bg-yellow-900/50 border-2 border-yellow-500 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <AlertDescription className="text-yellow-200 font-bold">
                {inPenalty('home') && `${homeTeam.name} in penalty`}
                {inPenalty('home') && inPenalty('away') && ' | '}
                {inPenalty('away') && `${awayTeam.name} in penalty`}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Voice Assistant - Add below scoreboard */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="flex justify-end mb-2">
          <Button
            onClick={() => setShowVoiceAssistant(!showVoiceAssistant)}
            variant="outline"
            size="sm"
            className="border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-bold"
          >
            {showVoiceAssistant ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Voice Assistant
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Show Voice Assistant
              </>
            )}
          </Button>
        </div>
        {showVoiceAssistant && (
          <VoiceAssistant
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            onCommand={handleVoiceCommand}
            sport="basketball"
          />
        )}
        {voiceFeedback?.text && (
          <div className={`mt-3 text-sm font-semibold ${voiceFeedback.status === 'success' ? 'text-green-600' : voiceFeedback.status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
            {voiceFeedback.status === 'processing' ? 'Listening: ' : voiceFeedback.status === 'success' ? 'Recorded: ' : 'Error: '} {voiceFeedback.text}
          </div>
        )}
      </div>

      {/* Control Panel */}
      {selectedPlayer ? (
        <div className="sticky z-30 bg-gradient-to-br from-gray-900 via-orange-900/20 to-gray-900" style={{ top: game.is_default ? '564px' : '464px' }}> {/* Updated top value */}
          <div className="mx-4 my-4">
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 border-4 border-blue-200 dark:border-blue-800 shadow-lg">
                      <AvatarImage src={selectedPlayer.photo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-lg">
                        {selectedPlayer.jersey_number}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        #{selectedPlayer.jersey_number} {selectedPlayer.first_name} {selectedPlayer.last_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                        {selectedTeam === 'home' ? homeTeam?.name : awayTeam?.name}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPlayer(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => addPoints(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 1)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-95 text-white font-black text-sm shadow-lg transition-all duration-150 hover:shadow-xl disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    +1 PT
                  </Button>
                  <Button
                    onClick={() => addPoints(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 2)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:scale-95 text-white font-black text-sm shadow-lg transition-all duration-150 hover:shadow-xl disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    +2 PTS
                  </Button>
                  <Button
                    onClick={() => addPoints(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 3)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white font-black text-sm shadow-lg transition-all duration-150 hover:shadow-xl disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    +3 PTS
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'rebounds', 1)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole === 'viewer')}
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    REB
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'assists', 1)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole === 'viewer')}
                  >
                    <Target className="w-4 h-4 mr-1" />
                    AST
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'steals', 1)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole === 'viewer')}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    STL
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'blocks', 1)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole === 'viewer')}
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    BLK
                  </Button>
                  <Button
                    onClick={() => handleFoul(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    FOUL
                  </Button>
                  <Button
                    onClick={handleUndo}
                    disabled={undoInProgress || actionHistory.length === 0 || (game.sport === 'basketball' && userRole !== 'overall')}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    UNDO
                  </Button>
                </div>

                {/* QUARTER STATS */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Quarter Stats:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuarterStats(!showQuarterStats)}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      {showQuarterStats ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          Show
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {showQuarterStats && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        <div>
                          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'points')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">PTS</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-green-600 dark:text-green-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'rebounds')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">REB</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'assists')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">AST</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'steals')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">STL</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'blocks')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">BLK</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'fouls')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">FOULS</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-2 border-blue-300 dark:border-gray-700 rounded-xl p-8 text-center shadow-lg">
          <User className="w-16 h-16 text-blue-500 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-xl font-black text-gray-900 dark:text-white mb-2">Select a Player</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Click on a player below to start tracking statistics
          </p>
        </div>
      )}

      {/* Players Section */}
      <div className="max-w-7xl mx-auto p-4 pb-24">
        <div className="grid md:grid-cols-2 gap-4"> {/* Changed lg:grid-cols-2 to md:grid-cols-2 */}
          {/* Home Team */}
          <div className="flex flex-col h-[700px] bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-950/40 border-4 border-orange-500 backdrop-blur-sm rounded-xl">
            <div className="flex-shrink-0 bg-orange-200 dark:bg-orange-900/95 backdrop-blur-sm border-b-4 border-orange-500 p-3 rounded-t-xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  {homeTeam.name} - HOME
                </h2>
                <Button
                  onClick={() => useTimeout('home')}
                  disabled={undoInProgress || homeTimeouts === 0 || (game.sport === 'basketball' && userRole !== 'overall')}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  TO ({homeTimeouts})
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {homePlayers.map(player => (
                <PlayerRow key={getPlayerRenderKey(player.id)} player={player} team="home" teamId={game.home_team_id} onSelect={handlePlayerSelect} />
              ))}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col h-[700px] bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-950/40 border-4 border-blue-500 backdrop-blur-sm rounded-xl">
            <div className="flex-shrink-0 bg-blue-200 dark:bg-blue-900/95 backdrop-blur-sm border-b-4 border-blue-500 p-3 rounded-t-xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  {awayTeam.name} - AWAY
                </h2>
                <Button
                  onClick={() => useTimeout('away')}
                  disabled={undoInProgress || awayTimeouts === 0 || (game.sport === 'basketball' && userRole !== 'overall')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  TO ({awayTimeouts})
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {awayPlayers.map(player => (
                <PlayerRow key={getPlayerRenderKey(player.id)} player={player} team="away" teamId={game.away_team_id} onSelect={handlePlayerSelect} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Declare Default Dialog */}
      <Dialog open={showDefaultDialog} onOpenChange={setShowDefaultDialog}>
        <DialogContent className="bg-white dark:bg-gray-900 border-4 border-red-500 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white text-2xl font-black flex items-center gap-2">
              <Flag className="w-6 h-6 text-red-500 dark:text-red-400" />
              Declare Game Default
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-gray-300 font-bold">
              Select which team is defaulting. The non-defaulting team will automatically win 20-0.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="bg-red-900/50 border-2 border-red-500">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200 font-bold text-sm">
                ⚠️ This action will end the game immediately. The defaulting team will receive a loss and the other team will receive a win.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={() => handleDeclareDefault(game.home_team_id)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-lg py-6 border-2 border-orange-400"
              >
                {homeTeam.name} DEFAULTS
                <span className="ml-2 text-sm">(Away team wins 20-0)</span>
              </Button>
              
              <Button
                onClick={() => handleDeclareDefault(game.away_team_id)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-6 border-2 border-blue-400"
              >
                {awayTeam.name} DEFAULTS
                <span className="ml-2 text-sm">(Home team wins 20-0)</span>
              </Button>
            </div>

            <Button
              onClick={() => setShowDefaultDialog(false)}
              variant="outline"
              className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-black"
            >
              CANCEL
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Quarter Dialog */}
      <Dialog open={showQuarterEnd} onOpenChange={setShowQuarterEnd}>
        <DialogContent className="bg-white dark:bg-gray-900 border-4 border-orange-500 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white text-2xl font-black">
              End of {quarterLabel}
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-gray-300 font-bold">
              {currentQuarter === 4 && homeScore === awayScore 
                ? 'Game is tied! Overtime will begin.' 
                : 'Save quarter data and proceed to next period?'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-300 dark:border-gray-700">
              <div className="flex justify-between text-lg font-bold mb-3 text-gray-900 dark:text-white">
                <span>{homeTeam.name}</span>
                <span className="text-orange-600 dark:text-orange-500 text-3xl">{homeScore}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                <span>{awayTeam.name}</span>
                <span className="text-blue-600 dark:text-blue-500 text-3xl">{awayScore}</span>
              </div>
            </div>
            {currentQuarter === 4 && homeScore === awayScore && (
              <Alert className="bg-purple-900/50 border-2 border-purple-500">
                <AlertTriangle className="h-4 w-4 text-purple-400" />
                <AlertDescription className="text-purple-200 font-bold">
                  🏀 Game is tied! Overtime period (OT) will begin.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <Button
                onClick={endQuarter}
                className={`flex-1 font-black ${
                  currentQuarter >= 4 && homeScore === awayScore
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                    : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800'
                } text-white`}
              >
                {currentQuarter < 4 
                  ? `PROCEED TO Q${currentQuarter + 1}` 
                  : currentQuarter === 4 && homeScore === awayScore 
                    ? 'START OVERTIME' 
                    : currentQuarter > 4 && homeScore === awayScore
                      ? `PROCEED TO OT${currentQuarter - 3}`
                      : 'FINISH QUARTER'}
              </Button>
              <Button
                onClick={() => setShowQuarterEnd(false)}
                variant="outline"
                className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-black"
              >
                CANCEL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}