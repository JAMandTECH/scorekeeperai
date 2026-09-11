import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, PlayCircle, AlertTriangle, ChevronRight, Clock, TrendingUp, Target, Zap, Shield, RotateCcw, User, Eye, EyeOff, Flag, Sun, Moon, Loader2, Trash2 } from "lucide-react";
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
import { loadAllStatsPaginated } from "@/lib/liveScoringHelpers";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import { enqueueStatWrite, enqueueGameWrite, startStatSync } from "@/lib/statSyncQueue";
import LiveStreamEmbed from "@/components/LiveStreamEmbed";
import BroadcastOverlayDialog from "@/components/BroadcastOverlayDialog";
import { Radio } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function LiveScoring() {
  const [game, setGame] = useState(null);
  const [currentQuarter, setCurrentQuarter] = useState(1);
  const currentQuarterRef = useRef(1);
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
  const [savingQuarter, setSavingQuarter] = useState(false);
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
const urlParams = new URLSearchParams(window.location.search);
const editMode = urlParams.get('edit') === '1' || urlParams.get('mode') === 'edit';
const [showEditTotals, setShowEditTotals] = useState(false);
const [editTotals, setEditTotals] = useState({ home_score: 0, away_score: 0, home_timeouts: 0, away_timeouts: 0, home_team_fouls: 0, away_team_fouls: 0 });
const [showMoveStat, setShowMoveStat] = useState(false);
const [moveForm, setMoveForm] = useState({ sourcePlayer: '', sourceQuarter: 1, statType: 'points', amount: 1, destPlayer: '', destQuarter: 1 });
const [showDeleteGame, setShowDeleteGame] = useState(false);
const [deletingGame, setDeletingGame] = useState(false);
const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [hideLiveStream, setHideLiveStream] = useState(false);
  const [hideScoreOverlay, setHideScoreOverlay] = useState(false);

  const handleDeleteGame = async () => {
    if (!game?.id) return;
    if (user?.role !== 'admin') {
      alert('Only admins can delete games.');
      return;
    }
    setDeletingGame(true);
    try {
      // Delete all player stats for this game first
      const stats = await base44.entities.PlayerGameStats.filter({ game_id: game.id });
      await Promise.all(
        (stats || []).map((s) => base44.entities.PlayerGameStats.delete(s.id).catch(() => null))
      );
      // Then delete the game itself
      await base44.entities.Game.delete(game.id);
      setShowDeleteGame(false);
      navigate(createPageUrl('Games'));
    } catch (e) {
      console.error('Failed to delete game', e);
      alert('Failed to delete the game. Please check your permissions or connection.');
    } finally {
      setDeletingGame(false);
    }
  };

  // Fetch a single game by id, retrying on transient rate-limit errors with
  // exponential backoff so a brief spike doesn't leave the page stuck loading.
  const fetchGameByIdWithRetry = async (id, attempts = 7) => {
    let delay = 600;
    for (let i = 0; i < attempts; i++) {
      try {
        const games = await base44.entities.Game.filter({ id });
        return games && games[0];
      } catch (e) {
        const isRateLimit = /rate limit/i.test(e?.message || '');
        if (!isRateLimit || i === attempts - 1) throw e;
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 5000);
      }
    }
  };

  // Service-role backed safe game update (validates user is allowed on backend)
  const updateGameSafe = async (patch) => {
    try {
      // Avoid sending redundant writes to reduce backend load/timeouts
      if (!game?.id) return;
      const prev = {};
      Object.keys(patch || {}).forEach(k => { prev[k] = game[k]; });
      const same = JSON.stringify(prev) === JSON.stringify(patch || {});
      if (same) return;
      await base44.functions.invoke('updateGame', { game_id: game.id, patch });
    } catch (e) {
      // Connection lost after the optimistic UI already moved. Queue the patch
      // (survives refresh/crash, retried automatically on reconnect) instead of
      // throwing so game-level data — team fouls, timeouts, quarter transitions,
      // final score — can never be lost. Does NOT re-throw: callers keep their
      // optimistic state and the queue guarantees eventual persistence.
      console.error('updateGame failed — queuing for retry', e);
      enqueueGameWrite(game.id, patch);
    }
  };
  const updateGameByIdSafe = async (id, patch) => {
    try {
      if (!id) return;
      await base44.functions.invoke('updateGame', { game_id: id, patch });
    } catch (e) {
      console.error('updateGameById failed — queuing for retry', e);
      enqueueGameWrite(id, patch);
    }
  };


  // Initial load — runs ONCE on mount. Previously this effect depended on
  // game?.id, which caused loadGame() → setGame() → effect re-runs → loadGame()
  // in an infinite loop, hammering the API and tripping rate limits.
  useEffect(() => {
    loadGame();
    loadUser();
    startStatSync(); // begin background retry/reconnect handling for queued stat writes

    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Safety polling — separate effect that only restarts the interval when
  // the game id changes (not when the same id is re-set during load).
  useEffect(() => {
    if (!game?.id) return;
    const intervalId = setInterval(() => {
      refreshGameState();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [game?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep refs in sync with latest scores to avoid stale-closure issues in interval refresh
  useEffect(() => { homeScoreRef.current = homeScore; }, [homeScore]);
  useEffect(() => { awayScoreRef.current = awayScore; }, [awayScore]);
  useEffect(() => { currentQuarterRef.current = currentQuarter; }, [currentQuarter]);

  // Real-time subscribe to this game's updates to avoid poll races across devices
  useEffect(() => {
    if (!game?.id) return;
    const unsubscribe = base44.entities.Game.subscribe((event) => {
      if (event.id !== game.id) return;
      if (event.type === 'update' || event.type === 'create') {
        const g = event.data;
        if (g.status === 'completed' && !editMode) { navigate(createPageUrl("Games")); return; }
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
        setCurrentQuarter(Math.max(g.current_quarter || 1, currentQuarterRef.current));
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

  // Extra safety: if the game becomes completed for any reason, exit Live Scoring immediately
  useEffect(() => {
    if (game?.status === 'completed' && !editMode) {
      navigate(createPageUrl("Games"));
    }
  }, [game?.status]);

  const refreshGameState = async () => {
    if (!game?.id) return;
    if (Date.now() - lastWriteTsRef.current < 1200) return;
    try {
      const currentGame = await fetchGameByIdWithRetry(game.id);
      if (currentGame) {
        if (currentGame.status === 'completed' && !editMode) { navigate(createPageUrl("Games")); return; }
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
        setCurrentQuarter(Math.max(currentGame.current_quarter || 1, currentQuarterRef.current));
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

    let currentGame;
    try {
      currentGame = await fetchGameByIdWithRetry(gameId);
    } catch (e) {
      // Rate limit still tripping after all retries — retry the whole load
      // shortly rather than crashing the page or bouncing to Games.
      console.error('Failed to load game (rate limited), retrying shortly:', e);
      setTimeout(() => { loadGame(); }, 4000);
      return;
    }
    if (!currentGame) {
      navigate(createPageUrl("Games"));
      return;
    }

    if (currentGame.status === 'completed' && !editMode) {
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
      await updateGameByIdSafe(gameId, { status: 'in_progress' });
    }

    const statsMap = await loadAllStatsPaginated(gameId);
    setPlayerStats(statsMap);
  };

  // Teams and players don't change during a game — fetch once, no polling.
  const { data: homeTeam } = useQuery({
    queryKey: ['team', game?.home_team_id],
    queryFn: async () => {
      const teams = await base44.entities.Team.filter({ id: game?.home_team_id });
      return teams && teams[0];
    },
    enabled: !!game?.home_team_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: awayTeam } = useQuery({
    queryKey: ['team', game?.away_team_id],
    queryFn: async () => {
      const teams = await base44.entities.Team.filter({ id: game?.away_team_id });
      return teams && teams[0];
    },
    enabled: !!game?.away_team_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: homePlayers = [] } = useQuery({
    queryKey: ['players', game?.home_team_id],
    queryFn: async () => base44.entities.Player.filter({ team_id: game?.home_team_id }),
    enabled: !!game?.home_team_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: awayPlayers = [] } = useQuery({
    queryKey: ['players', game?.away_team_id],
    queryFn: async () => base44.entities.Player.filter({ team_id: game?.away_team_id }),
    enabled: !!game?.away_team_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
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

  // Authoritative team score = sum of every player's points across all quarters,
  // computed from the same playerStats the UI shows. Used on undo so the score
  // can never drift from the recorded stats ("wrong qty" bug).
  const computeTeamScoreFromStats = (teamId, statsSource) => {
    let total = 0;
    for (const key in statsSource) {
      const s = statsSource[key];
      if (s && s.team_id === teamId) total += Number(s.points || 0);
    }
    return total;
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
    if (!game?.id) {
      console.warn('Game not loaded yet for updatePlayerStats');
      return;
    }
    const key = getPlayerStatKey(playerId, quarter);

    // Optimistic UI update
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
      return { ...prev, [key]: newStatData };
    });

    try {
      lastWriteTsRef.current = Date.now();
      // Persist via server-side upsert to avoid any client RLS races.
      // Retry on transient rate-limit blips so a brief spike doesn't surface a
      // scary "Failed to save"/"Undo failed" alert for a write that would
      // succeed on a quick retry.
      let resp;
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          resp = await base44.functions.invoke('upsertPlayerStat', {
            game_id: game.id,
            player_id: playerId,
            team_id: teamId,
            quarter,
            updates: statUpdates,
          });
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          const msg = e?.message || e?.response?.data?.error || '';
          const status = e?.response?.status;
          const isTransient = /rate limit|timeout|temporarily|network/i.test(msg) || status === 429 || (status >= 500 && status < 600);
          if (!isTransient || attempt === 2) throw e;
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        }
      }
      if (lastErr) throw lastErr;
      const saved = resp?.data?.stat;
      if (saved?.id) {
        setPlayerStats(prev => ({ ...prev, [key]: { ...prev[key], id: saved.id } }));
      }
    } catch (error) {
      console.error('Error saving player stats — queuing for retry:', error);
      // Connection lost or server unreachable after retries. Instead of
      // reverting (which would silently lose the scorekeeper's tap), persist
      // the write to the offline queue. It survives refreshes/crashes and is
      // retried automatically every few seconds and on reconnect, so the
      // optimistic UI stays correct and nothing is lost.
      enqueueStatWrite({
        game_id: game.id,
        player_id: playerId,
        team_id: teamId,
        quarter,
        updates: statUpdates,
      });
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

    // Push to history IMMEDIATELY (before the await) so the undo stack order
    // always matches the order taps happened — not the order the async saves
    // happen to resolve in. Otherwise a later-resolving save reorders the stack
    // and undo pops the wrong action ("dropped points" / "wrong stat" bug).
    const historyEntry = {
      type: 'score',
      team: isHomeTeam ? 'home' : 'away',
      points: points,
      playerId: playerId,
      quarter: currentQuarter,
      oldHomeScore: oldHomeScore,
      oldAwayScore: oldAwayScore,
      statUpdates: statUpdates,
      snapshot,
    };
    setActionHistory(prev => [...prev, historyEntry]);

    try {
      await updatePlayerStats(playerId, teamId, statUpdates);
    } catch (error) {
      // Stat or score save failed — revert score UI and drop the history entry
      // we optimistically added so undo can't reverse a save that never happened.
      setHomeScore(oldHomeScore);
      setAwayScore(oldAwayScore);
      setActionHistory(prev => prev.filter(a => a !== historyEntry));
      alert('Failed to save — the score was NOT updated. Please check your connection and try again.');
    }
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
    // Push to history immediately (before the await) so undo order matches tap
    // order regardless of which async save resolves first.
    const historyEntry = {
      type: statType,
      playerId: playerId,
      teamId: teamId,
      quarter: currentQuarter,
      value: value,
      statUpdates: statUpdates,
    };
    setActionHistory(prev => [...prev, historyEntry]);
    try {
      await updatePlayerStats(playerId, teamId, statUpdates);
    } catch (error) {
      setActionHistory(prev => prev.filter(a => a !== historyEntry));
      alert('Failed to save stat. Please check your connection and try again.');
    }
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
    // Push to history immediately (before the awaits) so undo order matches tap order.
    const historyEntry = {
      type: 'foul',
      playerId: playerId,
      teamId: teamId,
      quarter: currentQuarter,
      team: currentTeam,
      oldTeamFouls: oldTeamFouls,
      statUpdates: statUpdates,
    };
    setActionHistory(prev => [...prev, historyEntry]);
    try {
      await updatePlayerStats(playerId, teamId, statUpdates);

      const newTeamFouls = oldTeamFouls + 1;
      if (isHomeTeam) {
        setHomeTeamFouls(newTeamFouls);
        lastWriteTsRef.current = Date.now();
        await updateGameSafe({ home_team_fouls: newTeamFouls });
      } else {
        setAwayTeamFouls(newTeamFouls);
        lastWriteTsRef.current = Date.now();
        await updateGameSafe({ away_team_fouls: newTeamFouls });
      }

      const totalFouls = getTotalPlayerFouls(playerId) + 1;
      if (totalFouls >= game.player_foul_limit) {
        alert(`⚠️ Player has reached foul limit (${game.player_foul_limit} fouls) and is disqualified!`);
      } else if (totalFouls === game.player_foul_limit - 1) {
        alert(`⚠️ Warning: Player has ${totalFouls} fouls! One more foul and they will be disqualified.`);
      }
    } catch (error) {
      setActionHistory(prev => prev.filter(a => a !== historyEntry));
      alert('Failed to save foul — the team foul count was NOT updated. Please check your connection and try again.');
    }
  };

  const handleTimeout = async (team) => {
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
      await updateGameSafe({ home_timeouts: newTimeouts });
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
      await updateGameSafe({ away_timeouts: newTimeouts });
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

    const lastAction = actionHistory[actionHistory.length - 1];
    // Only score/foul/timeout undos legitimately decrease team totals, so only
    // those open the "allow server decrease" window. A rebound/assist/steal/block
    // undo must NEVER be allowed to pull the score down — that was the bug where
    // undoing a stat visibly changed the score.
    if (['score', 'foul', 'timeout'].includes(lastAction.type)) {
      allowDecreaseUntilRef.current = Date.now() + 4000;
    }
    try {
      setActionHistory(prev => prev.slice(0, -1));

    if (lastAction.type === 'score') {
      lastWriteTsRef.current = Date.now();

      const reverseUpdates = lastAction.statUpdates.map(update => ({
        statType: update.statType,
        value: -update.value,
      }));
      const teamId = lastAction.team === 'home' ? game.home_team_id : game.away_team_id;
      const pointsBack = lastAction.points || 0;

      // INSTANT + CORRECT: drop the reversed points straight into the local
      // score so the UI moves immediately and by exactly the right amount,
      // instead of awaiting the round-trip and trusting a stale snapshot.
      const isHome = lastAction.team === 'home';
      setHomeScore((s) => Math.max(0, isHome ? s - pointsBack : s));
      setAwayScore((s) => Math.max(0, !isHome ? s - pointsBack : s));

      // Reverse the player stat on the server (retries internally). The backend
      // also decrements the game score by the same delta, so both stay in sync.
      await updatePlayerStats(lastAction.playerId, teamId, reverseUpdates, lastAction.quarter);
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
        updateGameSafe(teamPayload),
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

      await updateGameSafe(payload);
    }
    } catch (error) {
      // The stat write already retried internally and reverted its own optimistic
      // change on real failure. Restore the action so the scorekeeper can retry,
      // then re-sync scores from the server (source of truth) so the UI matches
      // exactly what's stored — no drift, no wrong quantity.
      console.error('Error during undo:', error);
      setActionHistory(prev => [...prev, lastAction]);
      lastWriteTsRef.current = 0;
      // Only re-sync scores from the server for undos that actually affect the
      // score. A failed stat undo must not disturb the on-screen score.
      if (['score', 'foul', 'timeout'].includes(lastAction.type)) {
        allowDecreaseUntilRef.current = Date.now() + 4000;
        await refreshGameState();
      }
      alert('Undo could not be saved — please try again in a moment.');
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
    // If end of regulation or OT and not tied, finish the game
    if (currentQuarter >= 4 && homeScore !== awayScore) {
      setShowQuarterEnd(false);
      await endGame();
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

    // Optimistic UI update
    setCurrentQuarter(nextQuarter);
    setShowQuarterEnd(false);
    setActionHistory([]);

    // Persist to server while showing saving overlay
    lastWriteTsRef.current = Date.now();
    setSavingQuarter(true);
    try {
      await updateGameSafe({
        quarter_scores: newQuarterScores,
        current_quarter: nextQuarter,
        home_team_fouls: 0,
        away_team_fouls: 0,
        overtime_count: newOvertimeCount,
        home_score: homeScore,
        away_score: awayScore,
      });
      lastGameUpdateAtRef.current = Date.now();
      // Quick sync to pull server copy
      setTimeout(() => { refreshGameState(); }, 300);
    } finally {
      setSavingQuarter(false);
    }
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

    // Finalize current quarter scores before completing the game
    const previousHomeTotalScore = quarterScores.reduce((sum, q) => sum + q.home, 0);
    const previousAwayTotalScore = quarterScores.reduce((sum, q) => sum + q.away, 0);
    const finalQuarterScore = {
      quarter: currentQuarter,
      home: homeScore - previousHomeTotalScore,
      away: awayScore - previousAwayTotalScore,
    };
    const finalQuarterScores = (() => {
      const idx = quarterScores.findIndex(q => q.quarter === currentQuarter);
      const updated = [...quarterScores];
      if (idx >= 0) updated[idx] = finalQuarterScore; else updated.push(finalQuarterScore);
      return updated;
    })();

    lastWriteTsRef.current = Date.now();
    setSavingQuarter(true);
    try {
      await updateGameSafe({
        quarter_scores: finalQuarterScores,
        current_quarter: currentQuarter,
        home_team_fouls: homeTeamFouls,
        away_team_fouls: awayTeamFouls,
        overtime_count: currentQuarter > 4 ? (currentQuarter - 4) : 0,
        status: 'completed',
        home_score: homeScore,
        away_score: awayScore,
      });
      lastGameUpdateAtRef.current = Date.now();
    } finally {
      setSavingQuarter(false);
      // Ensure we always exit Live Scoring even if the save throws
      navigate(createPageUrl("Games"));
    }

    const isAdmin = user?.role === 'admin';

    // Only admins can modify Team records due to RLS — skip for non-admins
    if (isAdmin) {
      // Fetch fresh team data to ensure we have latest wins/losses
      const allTeams = await base44.entities.Team.list();
      const home = allTeams.find(t => t.id === game.home_team_id);
      const away = allTeams.find(t => t.id === game.away_team_id);

      if (home && away) {
        if (homeScore > awayScore) {
          await base44.entities.Team.update(game.home_team_id, {
            wins: (home.wins || 0) + 1
          });
          await base44.entities.Team.update(game.away_team_id, {
            losses: (away.losses || 0) + 1
          });
        } else if (awayScore > homeScore) {
          await base44.entities.Team.update(game.home_team_id, {
            losses: (home.losses || 0) + 1
          });
          await base44.entities.Team.update(game.away_team_id, {
            wins: (away.wins || 0) + 1
          });
        } else {
          await base44.entities.Team.update(game.home_team_id, {
            draws: (home.draws || 0) + 1
          });
          await base44.entities.Team.update(game.away_team_id, {
            draws: (away.draws || 0) + 1
          });
        }
      }
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

    // Already navigated after completion save

    base44.entities.Notification.create({
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

    await updateGameSafe({
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

    await updateGameSafe({
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
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
        className={`w-full text-left border rounded-sm p-3 mb-2 transition-colors ${
          isFouledOut || isDisabledByRole
            ? 'bg-muted opacity-50 cursor-not-allowed border-border' 
            : isSelected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-card border-border hover:border-foreground/30'
        }`}
        disabled={isFouledOut || isDisabledByRole}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="w-10 h-10 border border-border">
              <AvatarImage src={player.photo_url} />
              <AvatarFallback className={`text-sm font-heading font-bold ${isSelected ? 'bg-background text-foreground' : 'bg-secondary text-foreground'}`}>
                {player.jersey_number}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className={`text-sm font-heading font-bold truncate ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                {player.first_name} {player.last_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className={`flex gap-3 ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
              <div className="text-center">
                <div className="text-xl font-heading font-bold tabular-nums">{points}</div>
                <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>PTS</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-heading font-bold tabular-nums">{rebounds}</div>
                <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>REB</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-heading font-bold tabular-nums">{assists}</div>
                <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>AST</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-heading font-bold tabular-nums">{steals}</div>
                <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>STL</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-heading font-bold tabular-nums">{blocks}</div>
                <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>BLK</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-heading font-bold tabular-nums ${totalFouls >= game.player_foul_limit - 1 ? 'text-destructive' : ''}`}>{totalFouls}</div>
                <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>FL</div>
              </div>
            </div>
            {isFouledOut && (
              <Badge className="bg-destructive text-destructive-foreground text-[10px] font-heading font-bold px-1.5 py-0.5">FOULED OUT</Badge>
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
    <div className="min-h-screen bg-background text-foreground">
      {/* TOP NAVIGATION BAR */}
      <div className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization?.logo_url && (
              <Avatar className="w-10 h-10 border border-border">
                <AvatarImage src={organization.logo_url} />
                <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-sm">
                  {organization.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h1 className="text-lg font-heading font-bold">{organization?.name || 'Live Scoring'}</h1>
              <p className="text-xs text-muted-foreground font-medium">Basketball Game Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusBadge />
            {game?.stream_url && (
              <Button
                onClick={() => setShowBroadcastDialog(true)}
                variant="outline"
                size="sm"
                className="font-medium"
              >
                <Radio className="w-4 h-4 mr-1" />
                Broadcast Overlay
              </Button>
            )}
            {game?.stream_url && (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-border bg-card">
                <Switch
                  checked={!hideLiveStream}
                  onCheckedChange={(checked) => setHideLiveStream(!checked)}
                  id="hide-stream-toggle"
                />
                <Label htmlFor="hide-stream-toggle" className="text-xs font-heading font-bold text-foreground cursor-pointer">
                  {hideLiveStream ? "Stream Hidden" : "Stream Visible"}
                </Label>
              </div>
            )}

            <Button
              onClick={toggleDarkMode}
              variant="outline"
              size="sm"
              className="border border-border text-foreground hover:bg-muted font-medium p-2"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Dashboard"))}
              variant="outline"
              size="sm"
              className="border border-border text-foreground hover:bg-muted font-medium"
            >
              <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* DEFAULT GAME ALERT */}
      {game.is_default && (
        <div className="sticky z-40 bg-destructive/10 border-b-2 border-destructive" style={{ top: '64px' }}>
          <div className="max-w-7xl mx-auto p-4">
            <Alert className="bg-destructive/10 border border-destructive/30">
              <Flag className="h-5 w-5 text-destructive" />
              <AlertDescription className="text-foreground font-medium flex items-center justify-between">
                <span>⚠️ This game ended by DEFAULT. {game.defaulted_team_id === homeTeam.id ? homeTeam.name : awayTeam.name} defaulted. Final Score: {game.home_score}-{game.away_score}</span>
                <Button
                  onClick={handleUndoDefault}
                  size="sm"
                  className="font-medium ml-4"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Undo Default
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {editMode && (
        <div className="sticky z-40 bg-muted border-b-2 border-border" style={{ top: game?.is_default ? '164px' : '64px' }}>
          <div className="max-w-7xl mx-auto p-3 flex items-center justify-between">
            <div className="text-foreground font-medium">Edit Mode: Adjust stats and team totals for a completed game</div>
            <div className="flex gap-2">
              <Button onClick={() => { setEditTotals({
                home_score: game?.home_score ?? 0,
                away_score: game?.away_score ?? 0,
                home_timeouts: game?.home_timeouts ?? 0,
                away_timeouts: game?.away_timeouts ?? 0,
                home_team_fouls: game?.home_team_fouls ?? 0,
                away_team_fouls: game?.away_team_fouls ?? 0,
              }); setShowEditTotals(true); }} className="font-medium">Edit Team Totals</Button>
              <Button onClick={() => setShowMoveStat(true)} variant="outline" className="font-medium">Move Stats</Button>
            </div>
          </div>
        </div>
      )}

      {/* Live Stream Embed (YouTube) — hidden automatically when stream_url is empty or toggled off */}
      {game.stream_url && game.stream_url.trim().length > 0 && !hideLiveStream && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <LiveStreamEmbed
            streamUrl={game.stream_url}
            gameTitle={`${homeTeam.name} vs ${awayTeam.name}`}
            game={{
              ...game,
              home_score: homeScore,
              away_score: awayScore,
              current_quarter: currentQuarter,
              quarter_scores: quarterScores,
              home_team_fouls: homeTeamFouls,
              away_team_fouls: awayTeamFouls,
              home_timeouts: homeTimeouts,
              away_timeouts: awayTimeouts,
            }}
            showScoreOverlay
            hideScoreOverlay={hideScoreOverlay}
            onToggleScoreOverlay={setHideScoreOverlay}
          />
        </div>
      )}

      {/* Main Scoreboard */}
      <div className="sticky z-40 bg-card border-b-2 border-border" style={{ top: game.is_default ? '164px' : '64px' }}>
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
            <Badge className="bg-destructive text-destructive-foreground px-6 py-2 text-base font-heading font-bold">
              <PlayCircle className="w-5 h-5 mr-2 animate-pulse" />
              LIVE - {quarterLabel}
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground px-4 py-2 text-sm font-heading font-bold uppercase">
              BASKETBALL
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground px-4 py-2 text-sm font-heading font-bold uppercase">
              {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR SEASON'}
            </Badge>
            {game.sport === 'basketball' && (
              <Badge variant="outline" className={`px-4 py-2 text-sm font-heading font-bold uppercase ${
                userRole === 'overall' ? 'border-primary text-primary' :
                userRole === 'home_stat' ? 'border-foreground text-foreground' :
                userRole === 'away_stat' ? 'border-foreground text-foreground' :
                'border-border text-muted-foreground'
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
              <div className="text-muted-foreground text-sm font-heading font-bold mb-2 uppercase tracking-wide">HOME</div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Avatar className="w-16 h-16 border border-border">
                  <AvatarImage src={homeTeam.logo_url} />
                  <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                    {homeTeam.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-foreground text-2xl font-heading font-bold text-left">{homeTeam.name}</div>
              </div>
              <div className="text-foreground text-5xl font-heading font-bold tabular-nums mb-2">{homeScore}</div>
              <div className="flex justify-center gap-4 text-xs font-medium items-center">
                <span className={`${inPenalty('home') ? 'text-destructive' : 'text-foreground'}`}>
                  FOULS: {homeTeamFouls}/{game.penalty_limit_per_quarter}
                </span>
                <span className="text-muted-foreground">TO: {homeTimeouts}</span>
                {activeTimeout === 'home' && (
                  <span className="ml-2 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-black animate-pulse">TIMEOUT</span>
                )}
              </div>
            </div>

            {/* QUARTER SCORES */}
            <div className="text-center">
              <div className="text-foreground text-lg font-heading font-bold mb-1">{quarterLabel}</div>
              <div className="text-sm text-muted-foreground font-medium">
                {[1, 2, 3, 4].map((q, idx) => {
                  const qScore = quarterScores.find(qs => qs.quarter === q);
                  return (
                    <span key={q}>
                      {`Q${q}:${qScore ? `${qScore.home}-${qScore.away}` : '-'}`}{idx < 3 ? ', ' : ''}
                    </span>
                  );
                })}
              </div>
              
              {/* BUTTONS */}
              <div className="flex gap-2 justify-center flex-wrap">
                {!game.is_default && game.status === 'in_progress' && (
                  <Button
                    onClick={() => setShowDefaultDialog(true)}
                    size="sm"
                    className="font-medium text-xs px-4 py-2"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    DEFAULT
                  </Button>
                )}
                {currentQuarter < 4 && (
                  <Button
                    onClick={() => setShowQuarterEnd(true)}
                    size="sm"
                    className="font-medium text-xs px-4 py-2"
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
                    className="font-medium text-xs px-4 py-2"
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
                    className="font-medium text-xs px-4 py-2"
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
                    className="font-medium text-xs px-4 py-2"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    START OT
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}

<Button
                  onClick={() => navigate(createPageUrl("Games"))}
                  variant="outline"
                  size="sm"
                  className="border border-border text-foreground hover:bg-muted font-medium text-xs px-4 py-2"
                >
                  CANCEL
                </Button>
                {user?.role === 'admin' && (
                  <Button
                    onClick={() => setShowDeleteGame(true)}
                    size="sm"
                    className="bg-destructive text-destructive-foreground font-medium text-xs px-4 py-2"
                    disabled={deletingGame}
                    title="Delete this game (Admin only)"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    DELETE GAME
                  </Button>
                )}
              </div>
            </div>

            {/* AWAY TEAM */}
            <div className="text-center">
              <div className="text-muted-foreground text-sm font-heading font-bold mb-2 uppercase tracking-wide">AWAY</div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="text-foreground text-2xl font-heading font-bold text-right">{awayTeam.name}</div>
                <Avatar className="w-16 h-16 border border-border">
                  <AvatarImage src={awayTeam.logo_url} />
                  <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                    {awayTeam.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-foreground text-5xl font-heading font-bold tabular-nums mb-2">{awayScore}</div>
              <div className="flex justify-center gap-4 text-xs font-medium items-center">
                <span className={`${inPenalty('away') ? 'text-destructive' : 'text-foreground'}`}>
                  FOULS: {awayTeamFouls}/{game.penalty_limit_per_quarter}
                </span>
                <span className="text-muted-foreground">TO: {awayTimeouts}</span>
                {activeTimeout === 'away' && (
                  <span className="ml-2 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-black animate-pulse">TIMEOUT</span>
                )}
              </div>
            </div>
          </div>

          {/* ALERTS */}
          {currentQuarter >= 4 && homeScore === awayScore && (
            <Alert className="bg-muted border border-border mb-4">
              <AlertTriangle className="h-5 w-5 text-foreground" />
              <AlertDescription className="text-foreground font-medium text-center">
                ⚠️ Game is TIED! Must play overtime period.
              </AlertDescription>
            </Alert>
          )}

          {(inPenalty('home') || inPenalty('away')) && (
            <Alert className="bg-muted border border-border mb-4">
              <AlertTriangle className="h-5 w-5 text-foreground" />
              <AlertDescription className="text-foreground font-medium">
                {inPenalty('home') && `${homeTeam.name} in penalty`}
                {inPenalty('home') && inPenalty('away') && ' | '}
                {inPenalty('away') && `${awayTeam.name} in penalty`}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Voice Assistant (rendered when toggled on) */}
      {showVoiceAssistant && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <VoiceAssistant
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            onCommand={handleVoiceCommand}
            sport="basketball"
          />
          {voiceFeedback?.text && (
            <div className={`mt-3 text-sm font-semibold ${voiceFeedback.status === 'success' ? 'text-green-600' : voiceFeedback.status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
              {voiceFeedback.status === 'processing' ? 'Listening: ' : voiceFeedback.status === 'success' ? 'Recorded: ' : 'Error: '} {voiceFeedback.text}
            </div>
          )}
        </div>
      )}

      {/* Control Panel */}
      {selectedPlayer ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border">
          <div className="mx-4 my-2">
            <Card className="border border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 border border-border">
                      <AvatarImage src={selectedPlayer.photo_url} />
                      <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                        {selectedPlayer.jersey_number}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-heading font-bold text-foreground">
                        {selectedPlayer.first_name} {selectedPlayer.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        {selectedTeam === 'home' ? homeTeam?.name : awayTeam?.name}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPlayer(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </Button>
                </div>

                <div className="flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap">
                  <Button
                    onClick={() => addPoints(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 1)}
                    className="flex-1 min-w-[80px] h-14 active:scale-95 font-heading font-bold text-sm transition-all duration-150 disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    +1 PT
                  </Button>
                  <Button
                    onClick={() => addPoints(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 2)}
                    className="flex-1 min-w-[80px] h-14 active:scale-95 font-heading font-bold text-sm transition-all duration-150 disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    +2 PTS
                  </Button>
                  <Button
                    onClick={() => addPoints(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 3)}
                    className="flex-1 min-w-[80px] h-14 active:scale-95 font-heading font-bold text-sm transition-all duration-150 disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    +3 PTS
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'rebounds', 1)}
                    variant="secondary"
                    className="flex-1 min-w-[80px] h-14 active:scale-95 font-medium text-xs transition-all duration-150 disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole === 'viewer')}
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    REB
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'assists', 1)}
                    variant="secondary"
                    className="flex-1 min-w-[80px] h-14 active:scale-95 font-medium text-xs transition-all duration-150 disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole === 'viewer')}
                  >
                    <Target className="w-4 h-4 mr-1" />
                    AST
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'steals', 1)}
                    variant="secondary"
                    className="flex-1 min-w-[80px] h-14 active:scale-95 font-medium text-xs transition-all duration-150 disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole === 'viewer')}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    STL
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'blocks', 1)}
                    variant="secondary"
                    className="flex-1 min-w-[80px] h-14 active:scale-95 font-medium text-xs transition-all duration-150 disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole === 'viewer')}
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    BLK
                  </Button>
                  <Button
                    onClick={() => handleFoul(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id)}
                    variant="secondary"
                    className="flex-1 min-w-[80px] h-14 active:scale-95 font-medium text-xs transition-all duration-150 disabled:opacity-50"
                    disabled={undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    FOUL
                  </Button>
                  <Button
                    onClick={handleUndo}
                    disabled={undoInProgress || actionHistory.length === 0 || (game.sport === 'basketball' && userRole !== 'overall')}
                    variant="outline"
                    className="flex-1 min-w-[80px] h-14 active:scale-95 font-medium text-xs transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    UNDO
                  </Button>
                </div>

                {/* QUARTER STATS */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-wide">Quarter Stats:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuarterStats(!showQuarterStats)}
                      className="text-muted-foreground hover:text-foreground"
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
                    <div className="p-4 bg-background border border-border">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        <div>
                          <div className="text-2xl font-heading font-bold text-foreground tabular-nums">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'points')}</div>
                          <div className="xs text-muted-foreground font-medium">PTS</div>
                        </div>
                        <div>
                          <div className="text-2xl font-heading font-bold text-foreground tabular-nums">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'rebounds')}</div>
                          <div className="xs text-muted-foreground font-medium">REB</div>
                        </div>
                        <div>
                          <div className="text-2xl font-heading font-bold text-foreground tabular-nums">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'assists')}</div>
                          <div className="xs text-muted-foreground font-medium">AST</div>
                        </div>
                        <div>
                          <div className="text-2xl font-heading font-bold text-foreground tabular-nums">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'steals')}</div>
                          <div className="xs text-muted-foreground font-medium">STL</div>
                        </div>
                        <div>
                          <div className="text-2xl font-heading font-bold text-foreground tabular-nums">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'blocks')}</div>
                          <div className="xs text-muted-foreground font-medium">BLK</div>
                        </div>
                        <div>
                          <div className="text-2xl font-heading font-bold text-foreground tabular-nums">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'fouls')}</div>
                          <div className="xs text-muted-foreground font-medium">FOULS</div>
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
        <div className="mx-4 mt-4 border border-border bg-card px-4 py-3 flex items-center gap-3">
          <p className="text-base font-heading font-bold text-foreground whitespace-nowrap">Select a Player</p>
          <span className="text-muted-foreground/40 select-none">·</span>
          <p className="text-sm text-muted-foreground font-medium truncate">
            Click on a player below to start tracking statistics
          </p>
          <Button
            onClick={() => setShowVoiceAssistant(!showVoiceAssistant)}
            variant="outline"
            size="sm"
            className="ml-auto border border-border text-foreground hover:bg-muted font-medium whitespace-nowrap"
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
      )}

      {/* Players Section */}
      <div className="max-w-7xl mx-auto p-4 pb-40">
        <div className="grid md:grid-cols-2 gap-4"> {/* Changed lg:grid-cols-2 to md:grid-cols-2 */}
          {/* Home Team */}
          <div className="flex flex-col h-[700px] bg-card border border-border rounded-sm">
            <div className="flex-shrink-0 bg-muted border-b border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-heading font-bold text-foreground">
                  {homeTeam.name} - HOME
                </h2>
                <Button
                  onClick={() => handleTimeout('home')}
                  disabled={undoInProgress || homeTimeouts === 0 || (game.sport === 'basketball' && userRole !== 'overall')}
                  className="font-medium text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  TO ({homeTimeouts})
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {[...homePlayers].sort((a, b) => {
                const an = parseInt(a.jersey_number || '0', 10);
                const bn = parseInt(b.jersey_number || '0', 10);
                if (!isNaN(an) && !isNaN(bn) && an !== bn) return an - bn;
                return String(a.jersey_number || '').localeCompare(String(b.jersey_number || ''));
              }).map(player => (
                <PlayerRow key={getPlayerRenderKey(player.id)} player={player} team="home" teamId={game.home_team_id} onSelect={handlePlayerSelect} />
              ))}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col h-[700px] bg-card border border-border rounded-sm">
            <div className="flex-shrink-0 bg-muted border-b border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-heading font-bold text-foreground">
                  {awayTeam.name} - AWAY
                </h2>
                <Button
                  onClick={() => handleTimeout('away')}
                  disabled={undoInProgress || awayTimeouts === 0 || (game.sport === 'basketball' && userRole !== 'overall')}
                  className="font-medium text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  TO ({awayTimeouts})
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {[...awayPlayers].sort((a, b) => {
                const an = parseInt(a.jersey_number || '0', 10);
                const bn = parseInt(b.jersey_number || '0', 10);
                if (!isNaN(an) && !isNaN(bn) && an !== bn) return an - bn;
                return String(a.jersey_number || '').localeCompare(String(b.jersey_number || ''));
              }).map(player => (
                <PlayerRow key={getPlayerRenderKey(player.id)} player={player} team="away" teamId={game.away_team_id} onSelect={handlePlayerSelect} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Declare Default Dialog */}
      <Dialog open={showDefaultDialog} onOpenChange={setShowDefaultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold flex items-center gap-2">
              <Flag className="w-6 h-6 text-destructive" />
              Declare Game Default
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              Select which team is defaulting. The non-defaulting team will automatically win 20-0.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-foreground font-medium text-sm">
                ⚠️ This action will end the game immediately. The defaulting team will receive a loss and the other team will receive a win.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={() => handleDeclareDefault(game.home_team_id)}
                className="w-full font-heading font-bold text-lg py-6"
              >
                {homeTeam.name} DEFAULTS
                <span className="ml-2 text-sm font-normal">(Away team wins 20-0)</span>
              </Button>
              
              <Button
                onClick={() => handleDeclareDefault(game.away_team_id)}
                variant="secondary"
                className="w-full font-heading font-bold text-lg py-6"
              >
                {awayTeam.name} DEFAULTS
                <span className="ml-2 text-sm font-normal">(Home team wins 20-0)</span>
              </Button>
            </div>

            <Button
              onClick={() => setShowDefaultDialog(false)}
              variant="outline"
              className="w-full font-medium"
            >
              CANCEL
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Quarter Dialog */}
      <Dialog open={showQuarterEnd} onOpenChange={setShowQuarterEnd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold">
              End of {quarterLabel}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              {currentQuarter === 4 && homeScore === awayScore 
                ? 'Game is tied! Overtime will begin.' 
                : 'Save quarter data and proceed to next period?'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted border border-border p-6">
              <div className="flex justify-between text-lg font-heading font-bold mb-3 text-foreground">
                <span>{homeTeam.name}</span>
                <span className="text-foreground text-3xl tabular-nums">{homeScore}</span>
              </div>
              <div className="flex justify-between text-lg font-heading font-bold text-foreground">
                <span>{awayTeam.name}</span>
                <span className="text-foreground text-3xl tabular-nums">{awayScore}</span>
              </div>
            </div>
            {currentQuarter === 4 && homeScore === awayScore && (
              <Alert className="bg-muted border border-border">
                <AlertTriangle className="h-4 w-4 text-foreground" />
                <AlertDescription className="text-foreground font-medium">
                  🏀 Game is tied! Overtime period (OT) will begin.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <Button
                onClick={endQuarter}
                disabled={savingQuarter || undoInProgress || (game.sport === 'basketball' && userRole !== 'overall')}
                className="flex-1 font-heading font-bold disabled:opacity-60"
              >
                {savingQuarter ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  currentQuarter < 4 
                    ? `PROCEED TO Q${currentQuarter + 1}` 
                    : currentQuarter === 4 && homeScore === awayScore 
                      ? 'START OVERTIME' 
                      : currentQuarter > 4 && homeScore === awayScore
                        ? `PROCEED TO OT${currentQuarter - 3}`
                        : 'END GAME'
                )}
              </Button>
              <Button
                onClick={() => setShowQuarterEnd(false)}
                variant="outline"
                className="flex-1 font-medium"
              >
                CANCEL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Team Totals Dialog */}
      <Dialog open={showEditTotals} onOpenChange={setShowEditTotals}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold">Edit Team Totals</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">Update final scores, timeouts, and team fouls.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Home Score</label>
              <input type="number" className="w-full rounded-md border px-2 py-1"
                value={editTotals.home_score}
                onChange={(e) => setEditTotals({ ...editTotals, home_score: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Away Score</label>
              <input type="number" className="w-full rounded-md border px-2 py-1"
                value={editTotals.away_score}
                onChange={(e) => setEditTotals({ ...editTotals, away_score: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Home TO</label>
              <input type="number" className="w-full rounded-md border px-2 py-1"
                value={editTotals.home_timeouts}
                onChange={(e) => setEditTotals({ ...editTotals, home_timeouts: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Away TO</label>
              <input type="number" className="w-full rounded-md border px-2 py-1"
                value={editTotals.away_timeouts}
                onChange={(e) => setEditTotals({ ...editTotals, away_timeouts: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Home Team Fouls</label>
              <input type="number" className="w-full rounded-md border px-2 py-1"
                value={editTotals.home_team_fouls}
                onChange={(e) => setEditTotals({ ...editTotals, home_team_fouls: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Away Team Fouls</label>
              <input type="number" className="w-full rounded-md border px-2 py-1"
                value={editTotals.away_team_fouls}
                onChange={(e) => setEditTotals({ ...editTotals, away_team_fouls: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setShowEditTotals(false)}>Cancel</Button>
            <Button onClick={async () => { await updateGameSafe({
              home_score: editTotals.home_score,
              away_score: editTotals.away_score,
              home_timeouts: editTotals.home_timeouts,
              away_timeouts: editTotals.away_timeouts,
              home_team_fouls: editTotals.home_team_fouls,
              away_team_fouls: editTotals.away_team_fouls,
            }); setShowEditTotals(false); }}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move/Reassign Stats Dialog */}
      <Dialog open={showMoveStat} onOpenChange={setShowMoveStat}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold">Reassign Stats</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">Move a stat from one player/quarter to another.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 text-sm font-heading font-bold text-foreground">From</div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Player</label>
              <select className="w-full rounded-md border px-2 py-1" value={moveForm.sourcePlayer} onChange={(e)=>setMoveForm({ ...moveForm, sourcePlayer: e.target.value })}>
                <option value="">Select player</option>
                {[...(homePlayers||[]), ...(awayPlayers||[])].map(p => (
                  <option key={p.id} value={p.id}>#{p.jersey_number} {p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Quarter</label>
              <input type="number" min="1" className="w-full rounded-md border px-2 py-1" value={moveForm.sourceQuarter} onChange={(e)=>setMoveForm({ ...moveForm, sourceQuarter: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Stat Type</label>
              <select className="w-full rounded-md border px-2 py-1" value={moveForm.statType} onChange={(e)=>setMoveForm({ ...moveForm, statType: e.target.value })}>
                <option value="points">points</option>
                <option value="rebounds">rebounds</option>
                <option value="assists">assists</option>
                <option value="steals">steals</option>
                <option value="blocks">blocks</option>
                <option value="three_pointers">three_pointers</option>
                <option value="field_goals_made">field_goals_made</option>
                <option value="field_goals_attempted">field_goals_attempted</option>
                <option value="free_throws_made">free_throws_made</option>
                <option value="free_throws_attempted">free_throws_attempted</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount</label>
              <input type="number" min="1" className="w-full rounded-md border px-2 py-1" value={moveForm.amount} onChange={(e)=>setMoveForm({ ...moveForm, amount: Number(e.target.value) })} />
            </div>
            <div className="col-span-2 text-sm font-heading font-bold text-foreground mt-2">To</div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Player</label>
              <select className="w-full rounded-md border px-2 py-1" value={moveForm.destPlayer} onChange={(e)=>setMoveForm({ ...moveForm, destPlayer: e.target.value })}>
                <option value="">Select player</option>
                {[...(homePlayers||[]), ...(awayPlayers||[])].map(p => (
                  <option key={p.id} value={p.id}>#{p.jersey_number} {p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Quarter</label>
              <input type="number" min="1" className="w-full rounded-md border px-2 py-1" value={moveForm.destQuarter} onChange={(e)=>setMoveForm({ ...moveForm, destQuarter: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setShowMoveStat(false)}>Cancel</Button>
            <Button onClick={async () => {
              const amt = Number(moveForm.amount) || 0;
              if (!game?.id || !moveForm.sourcePlayer || !moveForm.destPlayer || !amt) return;
              const all = [...(homePlayers||[]), ...(awayPlayers||[])];
              const srcP = all.find(p=>p.id===moveForm.sourcePlayer);
              const dstP = all.find(p=>p.id===moveForm.destPlayer);
              const srcTeamId = srcP?.team_id;
              const dstTeamId = dstP?.team_id;
              // Subtract from source
              await base44.functions.invoke('upsertPlayerStat', { game_id: game.id, player_id: moveForm.sourcePlayer, team_id: srcTeamId, quarter: Number(moveForm.sourceQuarter), updates: [{ statType: moveForm.statType, value: -amt }] });
              // Add to dest
              await base44.functions.invoke('upsertPlayerStat', { game_id: game.id, player_id: moveForm.destPlayer, team_id: dstTeamId, quarter: Number(moveForm.destQuarter), updates: [{ statType: moveForm.statType, value: amt }] });
              setShowMoveStat(false);
            }}>Move</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Game Confirmation Dialog (Admin only) */}
      <Dialog open={showDeleteGame} onOpenChange={setShowDeleteGame}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-destructive" />
              Delete This Game?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              This will permanently delete the game and all recorded player stats. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert className="bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-foreground font-medium text-sm">
              {homeTeam?.name} vs {awayTeam?.name} — {homeScore}-{awayScore} ({quarterLabel})
            </AlertDescription>
          </Alert>
          <div className="flex gap-3 mt-2">
            <Button
              onClick={handleDeleteGame}
              disabled={deletingGame}
              className="flex-1 bg-destructive text-destructive-foreground font-heading font-bold"
            >
              {deletingGame ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                </span>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  YES, DELETE GAME
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowDeleteGame(false)}
              variant="outline"
              disabled={deletingGame}
              className="flex-1 font-medium"
            >
              CANCEL
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {savingQuarter && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center">
          <div className="bg-card border border-border px-6 py-4 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="font-heading font-bold text-foreground">Saving quarter...</span>
          </div>
        </div>
      )}

      <BroadcastOverlayDialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog} game={game} />
    </div>
  );
}