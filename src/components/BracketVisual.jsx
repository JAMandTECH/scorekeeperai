import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, GripVertical, Save, Palette, Plus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import BracketPosterOverlay from "@/components/tournament/BracketPosterOverlay";

// ── Refined Neon Broadcast palette (fixed dark canvas, single accent per theme) ──
const CANVAS = "#0f0c18";
const CARD = "#1a1726";
const CARD_ELEVATED = "#211e2c";
const BORDER = "#2d2840";
const BORDER_SOFT = "#221f2e";
const TEXT_PRIMARY = "#ffffff";
const TEXT_SECONDARY = "#a0a0a0";
const GOLD = "#e8c468";
const RED = "#ef4444";
const GREEN = "#16a34a";
const GREEN_BORDER = "#15803d";

const THEME_OPTIONS = {
  neon: { accentColor: "#64ffda", connector: "rgba(100, 255, 218, 0.5)" },
  fire: { accentColor: "#ff6b6b", connector: "rgba(255, 107, 107, 0.5)" },
  toxic: { accentColor: "#ccff00", connector: "rgba(204, 255, 0, 0.5)" },
  violet: { accentColor: "#9d7bff", connector: "rgba(157, 123, 255, 0.5)" },
};

const hexA = (hex, a) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export default function BracketVisual({ tournament, matches, teams, games = [], onMatchClick, onTeamDrop, onMatchReorder, onSave, onLinkGame, canEdit = true, organization }) {
  const [selectedTheme, setSelectedTheme] = useState('violet');
  const [manualMode, setManualMode] = useState(tournament?.is_manual_bracket || false);
  const [manualMatches, setManualMatches] = useState(tournament?.manual_matches || []);
  const [connectors, setConnectors] = useState(tournament?.manual_connectors || []);
  const [sectionLabels, setSectionLabels] = useState(tournament?.manual_sections || []);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const theme = THEME_OPTIONS[selectedTheme];
  const accent = theme.accentColor;
  const getTeam = (teamId) => teams.find(t => t.id === teamId);

  // Lookup BracketMatch entities by team pairing so manual bracket cards can
  // display real series wins/winner synced from completed games. The manual
  // cards (tournament.manual_matches) carry only layout + team assignments;
  // the live series state lives on BracketMatch records. We bridge the two by
  // matching on home_team_id + away_team_id.
  const bracketMatchByTeams = React.useMemo(() => {
    const map = {};
    (matches || []).forEach((bm) => {
      if (bm.home_team_id && bm.away_team_id) {
        map[`${bm.home_team_id}|${bm.away_team_id}`] = bm;
      }
    });
    return map;
  }, [matches]);

  // Enrich manual match cards with real series state computed directly from
  // completed playoff games between the card's two teams, and propagate
  // series winners through the visual connectors into the next stage.
  //
  // Why compute from games (not BracketMatch entities): manual brackets and
  // BracketMatch entities are only loosely coupled. The auto-generated
  // BracketMatch rows are often empty (null teams) for manual brackets, and
  // their home/away slot layout can differ from the manual card layout. So
  // we derive win counts / winner from the actual completed games between
  // the two teams (playoff game types only), which is reliable regardless of
  // BracketMatch state. bracket_match_id is still attached when a
  // BracketMatch pairs by teams, so the "Link Game" dialog keeps working.
  const PLAYOFF_TYPES = ['play_in', 'playoffs', 'quarter_finals', 'semi_finals', 'finals'];

  const gameWinner = (g) => {
    if (g.winning_team_id) return g.winning_team_id;
    if (g.is_default && g.defaulted_team_id) {
      return g.defaulted_team_id === g.home_team_id ? g.away_team_id : g.home_team_id;
    }
    if (g.home_score > g.away_score) return g.home_team_id;
    if (g.away_score > g.home_score) return g.away_team_id;
    return null;
  };

  const computeSeries = (homeId, awayId, requiredWins) => {
    if (!homeId || !awayId) return null;
    const series = (games || []).filter(g =>
      g.status === 'completed' &&
      PLAYOFF_TYPES.includes(g.game_type) &&
      ((g.home_team_id === homeId && g.away_team_id === awayId) ||
       (g.home_team_id === awayId && g.away_team_id === homeId))
    );
    if (!series.length) return null;
    let homeWins = 0, awayWins = 0;
    series.forEach(g => {
      const w = gameWinner(g);
      if (w === homeId) homeWins++;
      else if (w === awayId) awayWins++;
    });
    const required = requiredWins || 1;
    const winner = homeWins >= required ? homeId : awayWins >= required ? awayId : null;
    return {
      home_team_wins: homeWins,
      away_team_wins: awayWins,
      winner_team_id: winner,
      status: winner ? 'completed' : 'in_progress',
      game_ids: series.map(g => g.id),
    };
  };

  const enrichedManualMatches = React.useMemo(() => {
    const byId = {};
    manualMatches.forEach(m => {
      byId[m.id] = {
        ...m,
        home_team_wins: 0,
        away_team_wins: 0,
        winner_team_id: null,
        status: m.status || 'pending',
        game_ids: [],
        _advanced: false,
      };
    });

    // Pass 1: derive series state from completed games for each card with both
    // teams. Attach bracket_match_id from a pairing BracketMatch if present.
    manualMatches.forEach(m => {
      const card = byId[m.id];
      const bm = (m.home_team_id && m.away_team_id)
        ? bracketMatchByTeams[`${m.home_team_id}|${m.away_team_id}`]
        : null;
      if (bm) card.bracket_match_id = bm.id;
      const s = computeSeries(m.home_team_id, m.away_team_id, m.required_wins);
      if (s) {
        card.home_team_wins = s.home_team_wins;
        card.away_team_wins = s.away_team_wins;
        card.winner_team_id = s.winner_team_id;
        card.status = s.status;
        card.game_ids = s.game_ids;
      } else if (bm) {
        // No completed games yet — fall back to BracketMatch placeholder state.
        card.home_team_wins = bm.home_team_wins || 0;
        card.away_team_wins = bm.away_team_wins || 0;
        card.status = bm.status || card.status;
        card.game_ids = bm.game_ids || [];
      }
    });

    // Iteratively advance winners through connectors and recompute series
    // state until no card changes in a full pass. This cascades QF winners
    // into SF, then SF winners into Finals — a single pass would miss the
    // second hop because SF winners are only computed after QF winners land.
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
      changed = false;
      iterations++;

      connectors.forEach(c => {
        const src = byId[c.from];
        if (!src || !src.winner_team_id) return;
        const dest = byId[c.to];
        if (!dest) return;
        // Don't advance a winner that is already placed in this destination card
        // (prevents duplicate same-team in both slots when home was pre-seeded).
        if (dest.home_team_id === src.winner_team_id || dest.away_team_id === src.winner_team_id) return;
        const slotKey = dest.home_team_id ? 'away_team_id' : 'home_team_id';
        if (!dest[slotKey]) {
          dest[slotKey] = src.winner_team_id;
          dest._advanced = true;
          changed = true;
        }
      });

      // Recompute series state for cards that just received an advanced team
      // so their counts render and their winner can advance next iteration.
      Object.values(byId).forEach(card => {
        if (!card._advanced) return;
        card._advanced = false;
        const s = computeSeries(card.home_team_id, card.away_team_id, card.required_wins);
        if (s) {
          card.home_team_wins = s.home_team_wins;
          card.away_team_wins = s.away_team_wins;
          card.winner_team_id = s.winner_team_id;
          card.status = s.status;
          card.game_ids = s.game_ids;
          if (s.winner_team_id) changed = true;
        }
      });
    }

    return manualMatches.map(m => {
      const { _advanced, ...rest } = byId[m.id];
      return rest;
    });
  }, [manualMatches, connectors, games, bracketMatchByTeams]);

  // Seed ranking within each division — MUST match the Home page standings exactly:
  // computed from completed, non-archived, regular_season games, ordered by
  // win% desc then point-differential desc. Produces { [teamId]: rankNumber }
  // scoped per division so #1 is the top team in that team's own division.
  const seedByTeamId = React.useMemo(() => {
    const sport = (tournament.sport || '').toLowerCase();
    const sportTeams = teams.filter(t => (t.sport || '').toLowerCase() === sport);

    // Compute per-team record from games, mirroring Home's getTeamStandings.
    const computed = sportTeams.map(team => {
      const teamGames = games.filter(g =>
        g.status === 'completed' &&
        (g.game_type || 'regular_season') === 'regular_season' &&
        (g.sport || '').toLowerCase() === sport &&
        g.archived !== true &&
        (g.home_team_id === team.id || g.away_team_id === team.id)
      );
      let wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0;
      teamGames.forEach(game => {
        const isHome = game.home_team_id === team.id;
        let teamScore = isHome ? game.home_score : game.away_score;
        let oppScore = isHome ? game.away_score : game.home_score;
        if (sport === 'volleyball' && Array.isArray(game.quarter_scores) && game.quarter_scores.length > 0) {
          const homeTotal = game.quarter_scores.reduce((s, q) => s + (q.home || 0), 0);
          const awayTotal = game.quarter_scores.reduce((s, q) => s + (q.away || 0), 0);
          const homeSets = game.quarter_scores.filter(q => q.home > q.away).length;
          const awaySets = game.quarter_scores.filter(q => q.away > q.home).length;
          teamScore = isHome ? homeTotal : awayTotal;
          oppScore = isHome ? awayTotal : homeTotal;
          if (homeSets > awaySets) isHome ? wins++ : losses++;
          else if (awaySets > homeSets) isHome ? losses++ : wins++;
        } else {
          if (teamScore > oppScore) wins++; else losses++;
        }
        pointsFor += Number(teamScore || 0);
        pointsAgainst += Number(oppScore || 0);
      });
      const gamesPlayed = wins + losses;
      return {
        id: team.id,
        division: team.division || '__none__',
        winPct: gamesPlayed > 0 ? wins / gamesPlayed : 0,
        diff: pointsFor - pointsAgainst,
      };
    });

    const byDivision = {};
    computed.forEach(t => { (byDivision[t.division] = byDivision[t.division] || []).push(t); });

    const map = {};
    Object.values(byDivision).forEach(divTeams => {
      divTeams
        .sort((a, b) => b.winPct - a.winPct || b.diff - a.diff)
        .forEach((t, idx) => { map[t.id] = idx + 1; });
    });
    return map;
  }, [teams, games, tournament.sport]);

  const teamsInBracket = new Set();
  matches.forEach(match => {
    if (match.home_team_id) teamsInBracket.add(match.home_team_id);
    if (match.away_team_id) teamsInBracket.add(match.away_team_id);
  });

  const availableTeams = teams.filter(t =>
    t.sport === tournament.sport &&
    (!tournament.division || t.division === tournament.division) &&
    !teamsInBracket.has(t.id)
  );

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    // droppableId format: `match-<matchId>-<slot>` where matchId may itself contain
    // hyphens (e.g. `manual-1712345678`). Parse by stripping the prefix and taking
    // the trailing slot segment, rejoining the rest as the matchId.
    const parseMatchDroppable = (id) => {
      const rest = id.slice('match-'.length);
      const lastDash = rest.lastIndexOf('-');
      return { matchId: rest.slice(0, lastDash), slot: rest.slice(lastDash + 1) };
    };

    // Handle team dragging from available teams
    if (sourceId === 'available-teams' && destId.startsWith('match-')) {
      const { matchId, slot } = parseMatchDroppable(destId);
      const teamId = availableTeams[source.index].id;

      // Manual bracket cards live only in local state, not in the DB match list.
      if (matchId.startsWith('manual-')) {
        setManualMatches(prev => prev.map(m =>
          m.id === matchId ? { ...m, [`${slot}_team_id`]: teamId } : m
        ));
      } else {
        onTeamDrop(matchId, slot, teamId);
      }
    }
    // Handle team swapping between match slots
    else if (sourceId.startsWith('match-') && destId.startsWith('match-')) {
      const { matchId: sourceMatchId, slot: sourceSlot } = parseMatchDroppable(sourceId);
      const { matchId: destMatchId, slot: destSlot } = parseMatchDroppable(destId);

      // Manual card slot-to-slot swap handled in local state.
      if (sourceMatchId.startsWith('manual-') || destMatchId.startsWith('manual-')) {
        setManualMatches(prev => {
          const src = prev.find(m => m.id === sourceMatchId);
          const dst = prev.find(m => m.id === destMatchId);
          if (!src || !dst) return prev;
          const srcTeam = src[`${sourceSlot}_team_id`];
          const dstTeam = dst[`${destSlot}_team_id`];
          return prev.map(m => {
            if (m.id === sourceMatchId) return { ...m, [`${sourceSlot}_team_id`]: dstTeam };
            if (m.id === destMatchId) return { ...m, [`${destSlot}_team_id`]: srcTeam };
            return m;
          });
        });
      } else {
        onTeamDrop(sourceMatchId, sourceSlot, destMatchId, destSlot);
      }
    }
    // Handle removing a team from a match slot back to the available pool
    else if (sourceId.startsWith('match-') && destId === 'available-teams') {
      const { matchId, slot } = parseMatchDroppable(sourceId);

      if (matchId.startsWith('manual-')) {
        setManualMatches(prev => prev.map(m =>
          m.id === matchId ? { ...m, [`${slot}_team_id`]: null } : m
        ));
      } else {
        onTeamDrop(matchId, slot, null);
      }
    }
    // Handle match card reordering within a round
    else if (sourceId.startsWith('round-') && destId.startsWith('round-')) {
      const sourceRound = sourceId.replace('round-', '');
      const destRound = destId.replace('round-', '');

      // Only allow reordering within the same round
      if (sourceRound === destRound && source.index !== destination.index) {
        if (onMatchReorder) {
          onMatchReorder(sourceRound, source.index, destination.index);
        }
      }
    }
  };

  const renderWinBox = (winCount) => (
    <div
      className="ml-auto shrink-0 flex items-center justify-center rounded-md font-heading font-bold text-xs w-7 h-7 tabular-nums"
      style={{ background: hexA(accent, 0.12), border: `1px solid ${hexA(accent, 0.35)}`, color: accent }}
      title="Series wins"
    >
      {winCount}
    </div>
  );

  const renderTeamSlot = (match, slot, teamId, isWinner, matchId) => {
    const team = getTeam(teamId);
    const isEditable = canEdit && (match.status === 'pending' || match.status === 'ready');
    const winCount = slot === 'home' ? Number(match.home_team_wins || 0) : Number(match.away_team_wins || 0);

    if (!team) {
      return (
        <Droppable droppableId={`match-${matchId}-${slot}`} isDropDisabled={!isEditable}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-colors"
              style={{
                border: `1px dashed ${snapshot.isDraggingOver ? accent : BORDER}`,
                background: snapshot.isDraggingOver ? hexA(accent, 0.08) : 'transparent',
              }}
            >
              <span className="text-xs font-heading font-bold tracking-wider" style={{ color: TEXT_SECONDARY }}>
                TBD
              </span>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      );
    }

    return (
      <Droppable droppableId={`match-${matchId}-${slot}`} isDropDisabled={!isEditable}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={snapshot.isDraggingOver ? "rounded-lg" : ""}
            style={snapshot.isDraggingOver ? { boxShadow: `0 0 0 2px ${accent}` } : {}}
          >
            <Draggable draggableId={`team-${teamId}-${matchId}-${slot}`} index={0} isDragDisabled={!isEditable}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...(isEditable ? provided.dragHandleProps : {})}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                  style={{
                    ...provided.draggableProps.style,
                    background: isWinner ? hexA(accent, 0.14) : CARD_ELEVATED,
                    border: `1px solid ${isWinner ? hexA(accent, 0.5) : BORDER}`,
                    boxShadow: snapshot.isDragging ? `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accent}` : 'none',
                    cursor: isEditable ? 'move' : 'pointer',
                  }}
                >
                  {isEditable && (
                    <GripVertical className="w-3 h-3 shrink-0" style={{ color: TEXT_SECONDARY }} />
                  )}
                  <div className="w-1 h-6 rounded-full shrink-0" style={{ background: accent }} />
                  <Avatar className="w-6 h-6 shrink-0" style={{ border: `1px solid ${BORDER}` }}>
                    <AvatarImage src={team.logo_url} />
                    <AvatarFallback
                      className="text-white text-[9px] font-heading font-bold"
                      style={{ background: hexA(accent, 0.85) }}
                    >
                      {team.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {seedByTeamId[team.id] && (
                    <span
                      className="shrink-0 flex items-center justify-center rounded-md font-heading font-bold text-[10px] w-5 h-5 tabular-nums"
                      style={{ background: hexA(accent, 0.16), color: accent, border: `1px solid ${hexA(accent, 0.3)}` }}
                      title="Division seed"
                    >
                      {seedByTeamId[team.id]}
                    </span>
                  )}
                  <span className="text-xs font-heading font-bold uppercase flex-1 truncate tracking-tight" style={{ color: TEXT_PRIMARY }}>
                    {team.name}
                  </span>
                  {isWinner && (
                    <Trophy className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
                  )}
                  {renderWinBox(winCount)}
                </div>
              )}
            </Draggable>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  const renderMatch = (match, isDraggable = false) => {
    const isCompleted = match.status === 'completed';
    const homeWins = isCompleted && match.winner_team_id === match.home_team_id;
    const awayWins = isCompleted && match.winner_team_id === match.away_team_id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.02 }}
        className="rounded-lg overflow-hidden relative"
        style={{
          width: '280px',
          minWidth: '240px',
          background: CARD,
          border: `1px solid ${hexA(accent, 0.28)}`,
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          cursor: isDraggable ? 'grab' : 'pointer',
        }}
        onClick={() => !isDraggable && onMatchClick && onMatchClick(match)}
      >
        {isDraggable && (
          <div className="absolute top-2 right-2 z-10 rounded p-1" style={{ background: hexA(accent, 0.12) }}>
            <GripVertical className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
          </div>
        )}
        <div className="space-y-1 p-2">
          {renderTeamSlot(match, 'home', match.home_team_id, homeWins, match.id)}
          {renderTeamSlot(match, 'away', match.away_team_id, awayWins, match.id)}
        </div>

        <div
          className="px-2 py-1.5 text-center"
          style={{ background: hexA(accent, 0.1), borderTop: `1px solid ${hexA(accent, 0.22)}` }}
        >
          <span className="text-[10px] font-heading font-bold tracking-wider" style={{ color: accent }}>
            {match.required_wins > 1 ? `BEST OF ${(match.required_wins * 2) - 1}` : 'SINGLE GAME'}
          </span>
        </div>

        {onLinkGame && match.home_team_id && match.away_team_id && (
          <button
            onClick={(e) => { e.stopPropagation(); onLinkGame(match); }}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-heading font-bold tracking-wider transition-colors"
            style={{ color: accent, borderTop: `1px solid ${BORDER_SOFT}` }}
            title="Link a scheduled game to auto-count wins"
          >
            <Link2 className="w-3 h-3" />
            {(match.game_ids?.length || 0) > 0 ? `${match.game_ids.length} GAME${match.game_ids.length > 1 ? 'S' : ''} LINKED` : 'LINK GAME'}
          </button>
        )}
      </motion.div>
    );
  };

  const groupMatchesByRound = () => {
    const grouped = {};
    matches.forEach(match => {
      if (!grouped[match.round_name]) {
        grouped[match.round_name] = [];
      }
      grouped[match.round_name].push(match);
    });
    return grouped;
  };

  const matchesByRound = groupMatchesByRound();
  const roundOrder = tournament.num_teams === 16
    ? ['round_of_16', 'quarter_finals', 'semi_finals', 'finals']
    : tournament.num_teams === 8
    ? ['quarter_finals', 'semi_finals', 'finals']
    : ['semi_finals', 'finals'];

  const finalsMatch = matchesByRound['finals']?.[0];
  const champion = finalsMatch?.winner_team_id ? getTeam(finalsMatch.winner_team_id) : null;

  const getRoundLabel = (roundName) => roundName.replace(/_/g, ' ').toUpperCase();

  const hasAllTeamsSeeded = matches.filter(m => m.round_name === roundOrder[0]).every(m => m.home_team_id && m.away_team_id);

  // Precompute champion vertical offset (kept out of JSX for readability).
  const championMarginTop = (() => {
    if (roundOrder.length === 1) return '50px';
    const MATCH_HEIGHT = 100;
    const BASE_GAP = 80;
    let cumulativeOffset = 0;
    const finalsRoundIdx = roundOrder.length - 1;
    for (let i = 0; i < finalsRoundIdx; i++) {
      const gapAtLevel = BASE_GAP * Math.pow(2, i);
      cumulativeOffset += (MATCH_HEIGHT + gapAtLevel) / 2;
    }
    return `${cumulativeOffset + (MATCH_HEIGHT / 2)}px`;
  })();

  const handleAddManualMatch = () => {
    const newMatch = {
      id: `manual-${Date.now()}`,
      home_team_id: null,
      away_team_id: null,
      status: 'pending',
      required_wins: 1,
      position: { x: 100, y: 100 + (manualMatches.length * 150) }
    };
    setManualMatches([...manualMatches, newMatch]);
  };

  const handleDeleteManualMatch = (matchId) => {
    setManualMatches(manualMatches.filter(m => m.id !== matchId));
    setConnectors(connectors.filter(c => c.from !== matchId && c.to !== matchId));
    if (selectedMatch === matchId) setSelectedMatch(null);
  };

  const handleManualMatchDrag = (matchId, newPosition) => {
    setManualMatches(manualMatches.map(m =>
      m.id === matchId ? { ...m, position: newPosition } : m
    ));
  };

  const handleSetRequiredWins = (matchId, requiredWins) => {
    setManualMatches(manualMatches.map(m =>
      m.id === matchId ? { ...m, required_wins: requiredWins } : m
    ));
  };

  const handleConnectMatches = (fromId, toId) => {
    if (fromId === toId) return;
    const existingConnector = connectors.find(c => c.from === fromId && c.to === toId);
    if (!existingConnector) {
      setConnectors([...connectors, { from: fromId, to: toId }]);
    }
    setConnectingFrom(null);
  };

  const handleAddSectionLabel = (labelText) => {
    const newLabel = {
      id: `section-${Date.now()}`,
      text: labelText,
      position: { x: 100 + (sectionLabels.length * 320), y: 20 }
    };
    setSectionLabels([...sectionLabels, newLabel]);
  };

  const handleSectionLabelDrag = (labelId, newPosition) => {
    setSectionLabels(sectionLabels.map(l =>
      l.id === labelId ? { ...l, position: newPosition } : l
    ));
  };

  const handleDeleteSectionLabel = (labelId) => {
    setSectionLabels(sectionLabels.filter(l => l.id !== labelId));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* ── Header region ── */}
        <div className="rounded-2xl p-4 md:p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 md:w-7 md:h-7 shrink-0" style={{ color: accent }} />
              <div>
                <h2 className="text-xl md:text-2xl font-heading font-bold tracking-tight" style={{ color: TEXT_PRIMARY }}>
                  {tournament.name}
                </h2>
                <p className="text-xs font-heading font-bold mt-1 tracking-wider" style={{ color: accent }}>
                  {tournament.sport.toUpperCase()} • {tournament.num_teams} TEAMS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: CANVAS, border: `1px solid ${BORDER}` }}>
                <Palette className="w-3.5 h-3.5 ml-1" style={{ color: TEXT_SECONDARY }} />
                {Object.keys(THEME_OPTIONS).map((themeName) => (
                  <button
                    key={themeName}
                    onClick={() => setSelectedTheme(themeName)}
                    className="px-3 py-1.5 rounded-md text-xs font-heading font-bold capitalize transition-colors"
                    style={
                      selectedTheme === themeName
                        ? { background: THEME_OPTIONS[themeName].accentColor, color: CANVAS }
                        : { color: TEXT_SECONDARY }
                    }
                  >
                    {themeName}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setManualMode(!manualMode)}
                variant="outline"
                className="text-xs font-heading font-bold"
                style={{ borderColor: BORDER, color: TEXT_PRIMARY, background: 'transparent' }}
              >
                {manualMode ? 'Auto Mode' : 'Manual Mode'}
              </Button>
              <Badge
                className="text-xs md:text-sm px-4 md:px-6 py-2 font-heading font-bold border-0"
                style={{ background: hexA(accent, 0.16), color: accent, border: `1px solid ${hexA(accent, 0.4)}` }}
              >
                {manualMode ? 'MANUAL BUILDER' : 'TOURNAMENT BRACKET'}
              </Badge>
              {canEdit && hasAllTeamsSeeded && onSave && (
                <Button
                  onClick={onSave}
                  className="text-white font-heading font-bold text-sm"
                  style={{ background: GREEN, border: `1px solid ${GREEN_BORDER}` }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Save Bracket</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className={canEdit && availableTeams.length > 0 ? 'grid lg:grid-cols-[280px,1fr] gap-6' : ''}>
          {/* ── Available Teams panel ── */}
          {canEdit && availableTeams.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <h3 className="text-sm font-heading font-bold mb-1 flex items-center gap-2" style={{ color: TEXT_PRIMARY }}>
                <GripVertical className="w-4 h-4" style={{ color: accent }} />
                Available Teams
              </h3>
              <p className="text-xs mb-4" style={{ color: TEXT_SECONDARY }}>
                Drag teams to bracket slots
              </p>
              <Droppable droppableId="available-teams">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                    {availableTeams.map((team, index) => (
                      <Draggable key={team.id} draggableId={`available-${team.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                            style={{
                              ...provided.draggableProps.style,
                              background: CARD_ELEVATED,
                              border: `1px solid ${snapshot.isDragging ? accent : BORDER}`,
                              boxShadow: snapshot.isDragging ? '0 10px 30px rgba(0,0,0,0.5)' : 'none',
                            }}
                          >
                            <GripVertical className="w-4 h-4 shrink-0" style={{ color: TEXT_SECONDARY }} />
                            <div className="w-1 h-6 rounded-full shrink-0" style={{ background: accent }} />
                            <Avatar className="w-6 h-6 shrink-0" style={{ border: `1px solid ${BORDER}` }}>
                              <AvatarImage src={team.logo_url} />
                              <AvatarFallback
                                className="text-white text-xs font-heading font-bold"
                                style={{ background: hexA(accent, 0.85) }}
                              >
                                {team.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-heading font-bold uppercase flex-1 truncate tracking-tight" style={{ color: TEXT_PRIMARY }}>
                              {team.name}
                            </span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )}

          <div className="relative">
            {!manualMode && <BracketPosterOverlay organization={organization} tournament={tournament} />}
            <div
              className="rounded-2xl p-4 md:p-8 overflow-x-auto relative"
              style={{ background: CANVAS, border: `1px solid ${BORDER}` }}
            >
              {manualMode ? (
                <div className="space-y-4">
                  {/* ── Manual builder toolbar ── */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button
                      onClick={handleAddManualMatch}
                      className="font-heading font-bold text-sm"
                      style={{ background: accent, color: CANVAS, border: 'none' }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Match Card
                    </Button>
                    <div className="flex items-center gap-1.5 rounded-lg p-1" style={{ background: CARD_ELEVATED, border: `1px solid ${BORDER}` }}>
                      <span className="text-[10px] font-heading font-bold uppercase tracking-wider pl-1.5" style={{ color: TEXT_SECONDARY }}>Section</span>
                      {['Play In', 'Quarter Finals', 'Semi Finals', 'Finals'].map((label) => (
                        <Button
                          key={label}
                          onClick={() => handleAddSectionLabel(label)}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-heading font-bold"
                          style={{ borderColor: hexA(accent, 0.4), color: accent, background: 'transparent' }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {label}
                        </Button>
                      ))}
                    </div>
                    {connectingFrom && (
                      <Button
                        onClick={() => setConnectingFrom(null)}
                        variant="outline"
                        className="font-heading font-bold text-sm"
                        style={{ borderColor: RED, color: RED, background: 'transparent' }}
                      >
                        Cancel Connection
                      </Button>
                    )}
                    {manualMatches.length > 0 && onSave && (
                      <Button
                        onClick={() => onSave({ manualMatches, connectors, sectionLabels })}
                        className="text-white font-heading font-bold text-sm"
                        style={{ background: GREEN, border: `1px solid ${GREEN_BORDER}` }}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Manual Bracket
                      </Button>
                    )}
                    <div
                      className="px-3 py-2 rounded-lg"
                      style={{
                        background: connectingFrom ? hexA(accent, 0.12) : CARD_ELEVATED,
                        border: `1px solid ${connectingFrom ? accent : BORDER}`,
                      }}
                    >
                      <span className="text-sm font-medium" style={{ color: TEXT_SECONDARY }}>
                        {connectingFrom ? 'Click target match to connect' : 'Select match → Connect → Select target'}
                      </span>
                    </div>
                  </div>

                  <BracketPosterOverlay organization={organization} tournament={tournament} manualMode />

                  <div className="relative" style={{ minHeight: '600px', minWidth: '1000px' }}>
                    {sectionLabels.map((label) => (
                      <SectionLabel
                        key={label.id}
                        label={label}
                        accent={accent}
                        onDrag={handleSectionLabelDrag}
                        onDelete={handleDeleteSectionLabel}
                      />
                    ))}
                    {enrichedManualMatches.map((match) => (
                      <ManualMatchCard
                        key={match.id}
                        match={match}
                        accent={accent}
                        teams={teams}
                        getTeam={getTeam}
                        renderTeamSlot={renderTeamSlot}
                        onDrag={handleManualMatchDrag}
                        onSetRequiredWins={handleSetRequiredWins}
                        onDelete={handleDeleteManualMatch}
                        onConnect={() => {
                          if (connectingFrom) {
                            handleConnectMatches(connectingFrom, match.id);
                          } else {
                            setConnectingFrom(match.id);
                          }
                        }}
                        isConnecting={connectingFrom === match.id}
                        isSelected={selectedMatch === match.id}
                        onSelect={() => setSelectedMatch(match.id)}
                      />
                    ))}

                    <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: '100%', height: '2000px', zIndex: 1000 }}>
                      {connectors.map((conn, idx) => {
                        const fromMatch = manualMatches.find(m => m.id === conn.from);
                        const toMatch = manualMatches.find(m => m.id === conn.to);
                        if (!fromMatch || !toMatch) return null;

                        const x1 = fromMatch.position.x + 280;
                        const y1 = fromMatch.position.y + 50;
                        const x2 = toMatch.position.x;
                        const y2 = toMatch.position.y + 50;
                        const midX = (x1 + x2) / 2;

                        return (
                          <g key={idx}>
                            <path
                              d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
                              stroke={theme.connector}
                              strokeWidth="2"
                              fill="none"
                            />
                            <circle cx={midX} cy={y2} r="3.5" fill={accent} />
                            <circle cx={midX} cy={y2} r="6" fill={accent} opacity="0.25" />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="flex relative pb-4" style={{ minWidth: 'max-content', gap: '100px' }}>
                  <AnimatePresence>
                    {roundOrder.map((roundName, roundIdx) => {
                      const roundMatches = matchesByRound[roundName] || [];
                      if (roundMatches.length === 0) return null;

                      const sortedMatches = [...roundMatches].sort((a, b) => a.match_number - b.match_number);
                      const matchCount = sortedMatches.length;
                      const MATCH_HEIGHT = 100;
                      const BASE_GAP = 80;

                      // Calculate gap between matches to align with merge points from previous round
                      const matchGap = Math.pow(2, roundIdx) * BASE_GAP + (Math.pow(2, roundIdx) - 1) * MATCH_HEIGHT;

                      // Calculate vertical offset to center first match on merge point from previous round
                      let topOffset = 0;
                      if (roundIdx > 0) {
                        let prevGap = BASE_GAP;
                        for (let i = 0; i < roundIdx; i++) {
                          topOffset += MATCH_HEIGHT / 2 + prevGap / 2;
                          prevGap = Math.pow(2, i + 1) * BASE_GAP + (Math.pow(2, i + 1) - 1) * MATCH_HEIGHT;
                        }
                      }

                      return (
                        <motion.div
                          key={roundName}
                          className="flex flex-col"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: roundIdx * 0.05 }}
                        >
                          {/* ── Round marker (flat label + underline rule) ── */}
                          <div className="mb-8 text-center">
                            <h3 className="text-xs font-heading font-bold uppercase tracking-widest" style={{ color: accent }}>
                              {getRoundLabel(roundName)}
                            </h3>
                            <p className="text-[10px] font-medium mt-0.5" style={{ color: TEXT_SECONDARY }}>
                              {matchCount} {matchCount === 1 ? 'Match' : 'Matches'}
                            </p>
                            <div className="mx-auto mt-2 h-px" style={{ width: '48px', background: hexA(accent, 0.4) }} />
                          </div>

                          <Droppable droppableId={`round-${roundName}`} type="MATCH">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="flex flex-col relative"
                                style={{
                                  gap: `${matchGap}px`,
                                  marginTop: `${topOffset}px`,
                                  minHeight: `${sortedMatches.length * MATCH_HEIGHT + (sortedMatches.length - 1) * matchGap}px`,
                                  paddingBottom: '20px',
                                  ...(snapshot.isDraggingOver ? {
                                    background: hexA(accent, 0.05),
                                    borderRadius: '12px',
                                    boxShadow: `inset 0 0 0 1px ${hexA(accent, 0.3)}`,
                                  } : {})
                                }}
                              >
                                {sortedMatches.map((match, matchIdx) => {
                                  const isPairFirst = matchIdx % 2 === 0;
                                  const shouldDrawConnector = roundIdx < roundOrder.length - 1;

                                  return (
                                    <Draggable
                                      key={match.id}
                                      draggableId={`match-card-${match.id}`}
                                      index={matchIdx}
                                      isDragDisabled={!canEdit}
                                    >
                                      {(dragProvided, dragSnapshot) => (
                                        <div
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          {...dragProvided.dragHandleProps}
                                          className={`relative ${dragSnapshot.isDragging ? 'z-50 opacity-80' : ''}`}
                                          style={{
                                            height: `${MATCH_HEIGHT}px`,
                                            ...dragProvided.draggableProps.style
                                          }}
                                        >
                                          {renderMatch(match, canEdit)}

                                          {/* Outgoing connectors — crisp 2px hairlines, glow only at merge node */}
                                          {!dragSnapshot.isDragging && shouldDrawConnector && (
                                            <>
                                              {isPairFirst && (
                                                <svg
                                                  className="absolute pointer-events-none"
                                                  style={{
                                                    left: '280px',
                                                    top: `${MATCH_HEIGHT / 2}px`,
                                                    width: '100px',
                                                    height: `${matchGap / 2 + MATCH_HEIGHT / 2}px`,
                                                    overflow: 'visible',
                                                    zIndex: 1
                                                  }}
                                                >
                                                  <line x1="0" y1="0" x2="50" y2="0" stroke={theme.connector} strokeWidth="2" strokeLinecap="round" />
                                                  <line x1="50" y1="0" x2="50" y2={matchGap / 2 + MATCH_HEIGHT / 2} stroke={theme.connector} strokeWidth="2" strokeLinecap="round" />
                                                  <line x1="50" y1={matchGap / 2 + MATCH_HEIGHT / 2} x2="100" y2={matchGap / 2 + MATCH_HEIGHT / 2} stroke={theme.connector} strokeWidth="2" strokeLinecap="round" />
                                                  <circle cx="50" cy={matchGap / 2 + MATCH_HEIGHT / 2} r="3.5" fill={accent} />
                                                  <circle cx="50" cy={matchGap / 2 + MATCH_HEIGHT / 2} r="6" fill={accent} opacity="0.25" />
                                                </svg>
                                              )}
                                              {!isPairFirst && (
                                                <svg
                                                  className="absolute pointer-events-none"
                                                  style={{
                                                    left: '280px',
                                                    top: `${MATCH_HEIGHT / 2 - (matchGap / 2 + MATCH_HEIGHT / 2)}px`,
                                                    width: '50px',
                                                    height: `${matchGap / 2 + MATCH_HEIGHT / 2}px`,
                                                    overflow: 'visible',
                                                    zIndex: 1
                                                  }}
                                                >
                                                  <line x1="0" y1={matchGap / 2 + MATCH_HEIGHT / 2} x2="50" y2={matchGap / 2 + MATCH_HEIGHT / 2} stroke={theme.connector} strokeWidth="2" strokeLinecap="round" />
                                                  <line x1="50" y1={matchGap / 2 + MATCH_HEIGHT / 2} x2="50" y2="0" stroke={theme.connector} strokeWidth="2" strokeLinecap="round" />
                                                  <circle cx="50" cy="0" r="3.5" fill={accent} />
                                                  <circle cx="50" cy="0" r="6" fill={accent} opacity="0.25" />
                                                </svg>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {champion && (
                    <motion.div
                      className="flex items-center pl-4 md:pl-8 relative z-10"
                      style={{ marginTop: championMarginTop }}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, delay: 0.3 }}
                    >
                      <div className="text-center">
                        <Trophy
                          className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-4"
                          style={{ color: GOLD, filter: 'drop-shadow(0 0 12px rgba(232, 196, 104, 0.4))' }}
                        />
                        <div
                          className="rounded-2xl p-4 md:p-6 w-[200px] md:w-[240px] relative overflow-hidden"
                          style={{ background: CARD, border: `2px solid ${GOLD}`, boxShadow: '0 0 30px rgba(232, 196, 104, 0.25), 0 12px 30px rgba(0,0,0,0.4)' }}
                        >
                          <Avatar className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 relative z-10" style={{ border: `2px solid ${GOLD}` }}>
                            <AvatarImage src={champion.logo_url} />
                            <AvatarFallback className="text-xl md:text-2xl font-heading font-black" style={{ background: GOLD, color: CANVAS }}>
                              {champion.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="text-base md:text-lg font-heading font-black uppercase mb-2 relative z-10 tracking-tight" style={{ color: TEXT_PRIMARY }}>
                            {champion.name}
                          </h3>
                          <Badge
                            className="font-heading font-bold text-xs md:text-sm px-3 md:px-4 py-1 relative z-10 border-0"
                            style={{ background: GOLD, color: CANVAS }}
                          >
                            CHAMPION
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}

const SERIES_OPTIONS = [
  { label: 'SINGLE GAME', wins: 1 },
  { label: 'BEST OF 3', wins: 2 },
  { label: 'BEST OF 5', wins: 3 },
  { label: 'BEST OF 7', wins: 4 },
];

function ManualMatchCard({ match, accent, teams, getTeam, renderTeamSlot, onDrag, onSetRequiredWins, onDelete, onConnect, isConnecting, isSelected, onSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    // Only the dedicated drag handle moves the card. Team slots and the
    // series selector remain free so @hello-pangea/dnd can handle team drags.
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onSelect();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    onDrag(match.id, {
      x: match.position.x + deltaX,
      y: match.position.y + deltaY
    });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, match.position]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${match.position.x}px`,
        top: `${match.position.y}px`,
        zIndex: isDragging ? 100 : isSelected ? 50 : 1
      }}
      onMouseDown={() => onSelect()}
    >
      <div
        className="rounded-lg overflow-hidden transition-colors"
        style={{
          width: '280px',
          background: CARD,
          border: `2px solid ${isConnecting ? accent : isSelected ? '#a855f7' : BORDER}`,
          boxShadow: isConnecting ? `0 0 0 1px ${accent}, 0 8px 24px rgba(0,0,0,0.4)` : '0 6px 20px rgba(0,0,0,0.35)',
        }}
      >
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center gap-1.5 px-2 py-1.5 select-none"
          style={{ background: CARD_ELEVATED, borderBottom: `1px solid ${BORDER}`, cursor: isDragging ? 'grabbing' : 'grab' }}
          title="Drag to move this match card"
        >
          <GripVertical className="w-4 h-4 shrink-0" style={{ color: TEXT_SECONDARY }} />
          <span className="text-[10px] font-heading font-bold uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>Move</span>
        </div>
        <div className="absolute top-1.5 right-2 flex gap-1 z-10 action-button">
          <button
            onClick={(e) => { e.stopPropagation(); onConnect(); }}
            className="p-1.5 rounded transition-colors"
            style={{ background: isConnecting ? accent : hexA(accent, 0.12) }}
            title="Connect to another match"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isConnecting ? CANVAS : accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(match.id); }}
            className="p-1.5 rounded transition-colors"
            style={{ background: hexA(RED, 0.12) }}
            title="Delete match"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </div>
        <div className="space-y-1 p-2 team-slot-area">
          {renderTeamSlot(match, 'home', match.home_team_id, match.winner_team_id && match.winner_team_id === match.home_team_id, match.id)}
          {renderTeamSlot(match, 'away', match.away_team_id, match.winner_team_id && match.winner_team_id === match.away_team_id, match.id)}
        </div>
        <div className="px-2 py-1.5 text-center action-button" style={{ background: hexA(accent, 0.1), borderTop: `1px solid ${hexA(accent, 0.22)}` }}>
          <select
            value={match.required_wins || 1}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => onSetRequiredWins(match.id, Number(e.target.value))}
            className="w-full bg-transparent text-[10px] font-heading font-bold text-center cursor-pointer outline-none appearance-none"
            style={{ color: accent }}
            title="Set number of games for this match"
          >
            {SERIES_OPTIONS.map((opt) => (
              <option key={opt.wins} value={opt.wins} style={{ background: CARD, color: TEXT_PRIMARY }}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label, accent, onDrag, onDelete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    onDrag(label.id, {
      x: label.position.x + deltaX,
      y: label.position.y + deltaY
    });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, label.position]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${label.position.x}px`,
        top: `${label.position.y}px`,
        zIndex: isDragging ? 200 : 60
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        className="group inline-flex items-center gap-3 rounded-lg px-4 py-2.5 select-none"
        style={{
          background: hexA(accent, 0.14),
          border: `1px solid ${hexA(accent, 0.4)}`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        title="Drag to move this section label"
      >
        <GripVertical className="w-4 h-4 shrink-0" style={{ color: hexA(accent, 0.7) }} />
        <h3 className="text-sm font-heading font-bold uppercase tracking-widest" style={{ color: accent }}>
          {label.text}
        </h3>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(label.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all shrink-0"
          style={{ background: hexA(RED, 0.18) }}
          title="Delete section label"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}