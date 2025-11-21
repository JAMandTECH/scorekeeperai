import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, GripVertical, Save, Palette, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const THEME_OPTIONS = {
  neon: {
    primary: 'from-cyan-500 via-blue-500 to-purple-600',
    accent: 'cyan',
    connector: 'rgba(34, 211, 238, 0.8)',
    matchBg: 'bg-gradient-to-br from-gray-950 via-blue-950/20 to-gray-950',
    winnerBg: 'from-cyan-500 to-blue-600 border-cyan-400',
    glow: 'shadow-[0_0_30px_rgba(34,211,238,0.5)]',
    accentColor: '#22d3ee'
  },
  fire: {
    primary: 'from-orange-500 via-red-500 to-pink-600',
    accent: 'orange',
    connector: 'rgba(251, 146, 60, 0.8)',
    matchBg: 'bg-gradient-to-br from-gray-950 via-orange-950/20 to-gray-950',
    winnerBg: 'from-orange-500 to-red-600 border-orange-400',
    glow: 'shadow-[0_0_30px_rgba(251,146,60,0.5)]',
    accentColor: '#fb923c'
  },
  toxic: {
    primary: 'from-lime-500 via-green-500 to-emerald-600',
    accent: 'lime',
    connector: 'rgba(132, 204, 22, 0.8)',
    matchBg: 'bg-gradient-to-br from-gray-950 via-green-950/20 to-gray-950',
    winnerBg: 'from-lime-500 to-green-600 border-lime-400',
    glow: 'shadow-[0_0_30px_rgba(132,204,22,0.5)]',
    accentColor: '#84cc16'
  },
  violet: {
    primary: 'from-purple-500 via-fuchsia-500 to-pink-600',
    accent: 'purple',
    connector: 'rgba(168, 85, 247, 0.8)',
    matchBg: 'bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950',
    winnerBg: 'from-purple-500 to-fuchsia-600 border-purple-400',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.5)]',
    accentColor: '#a855f7'
  }
};

export default function BracketVisual({ tournament, matches, teams, onMatchClick, onTeamDrop, onMatchReorder, onSave, canEdit = true }) {
  const [selectedTheme, setSelectedTheme] = useState('neon');
  const [manualMode, setManualMode] = useState(tournament?.is_manual_bracket || false);
  const [manualMatches, setManualMatches] = useState(tournament?.manual_matches || []);
  const [connectors, setConnectors] = useState(tournament?.manual_connectors || []);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const theme = THEME_OPTIONS[selectedTheme];
  const getTeam = (teamId) => teams.find(t => t.id === teamId);

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
    
    // Handle team dragging from available teams
    if (sourceId === 'available-teams' && destId.startsWith('match-')) {
      const parts = destId.split('-');
      const matchId = parts[1];
      const slot = parts[2];
      const teamId = availableTeams[source.index].id;
      
      onTeamDrop(matchId, slot, teamId);
    }
    // Handle team swapping between match slots
    else if (sourceId.startsWith('match-') && destId.startsWith('match-')) {
      const sourceParts = sourceId.split('-');
      const destParts = destId.split('-');
      const sourceMatchId = sourceParts[1];
      const sourceSlot = sourceParts[2];
      const destMatchId = destParts[1];
      const destSlot = destParts[2];
      
      onTeamDrop(sourceMatchId, sourceSlot, destMatchId, destSlot);
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

  const renderTeamSlot = (match, slot, teamId, isWinner, matchId) => {
    const team = getTeam(teamId);
    const isEditable = canEdit && (match.status === 'pending' || match.status === 'ready');
    
    if (!team) {
      return (
        <Droppable droppableId={`match-${matchId}-${slot}`} isDropDisabled={!isEditable}>
          {(provided, snapshot) => (
            <motion.div
              ref={provided.innerRef}
              {...provided.droppableProps}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02, borderColor: theme.accentColor }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed rounded-xl transition-all backdrop-blur-sm ${
                snapshot.isDraggingOver 
                  ? `border-cyan-400 bg-cyan-500/20 ${theme.glow}` 
                  : 'border-gray-700/50 bg-gray-900/30'
              }`}
              style={{
                boxShadow: snapshot.isDraggingOver ? `0 0 20px ${theme.accentColor}40` : 'none'
              }}
            >
              <motion.span 
                className="text-xs text-gray-400 font-bold tracking-wider"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                TBD
              </motion.span>
              {provided.placeholder}
            </motion.div>
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
            className={snapshot.isDraggingOver ? `ring-2 ring-${theme.accent}-400 rounded-lg` : ''}
          >
            <Draggable draggableId={`team-${teamId}-${matchId}-${slot}`} index={0} isDragDisabled={!isEditable}>
              {(provided, snapshot) => (
                <motion.div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ 
                    scale: 1.03,
                    boxShadow: `0 0 25px ${theme.accentColor}60`
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`flex items-center gap-2 px-3 py-2 border-2 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                    snapshot.isDragging ? `scale-105 border-cyan-400 ${theme.glow}` : ''
                  } ${
                    isWinner 
                      ? `bg-gradient-to-r ${theme.winnerBg} text-white shadow-lg` 
                      : 'bg-gray-900/60 border-gray-700/50 text-gray-100'
                  } ${isEditable ? 'cursor-move' : 'cursor-pointer'}`}
                  style={{
                    boxShadow: snapshot.isDragging ? `0 10px 40px ${theme.accentColor}60, 0 0 30px ${theme.accentColor}40` : isWinner ? `0 0 20px ${theme.accentColor}30` : 'none'
                  }}
                >
                  {isEditable && (
                    <div {...provided.dragHandleProps}>
                      <GripVertical className="w-3 h-3 text-gray-500" />
                    </div>
                  )}
                  <motion.div 
                    className={`w-1 h-6 rounded-full`}
                    style={{ 
                      background: `linear-gradient(to bottom, ${theme.accentColor}, ${theme.accentColor}80)`,
                      boxShadow: `0 0 10px ${theme.accentColor}`
                    }}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.8, 1, 0.8]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <Avatar className="w-6 h-6 border border-gray-600">
                    <AvatarImage src={team.logo_url} />
                    <AvatarFallback className={`bg-${theme.accent}-600 text-white text-[9px] font-bold`}>
                      {team.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-bold uppercase flex-1 truncate">
                    {team.name}
                  </span>
                  {isWinner && (
                    <motion.div
                      initial={{ rotate: -10, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    </motion.div>
                  )}
                </motion.div>
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

    const matchCard = (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ 
          scale: 1.04,
          boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${theme.accentColor}40`
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`${theme.matchBg} rounded-xl border-2 overflow-hidden backdrop-blur-md transition-all ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        style={{ 
          width: '240px', 
          minWidth: '200px',
          borderColor: `${theme.accentColor}40`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`
        }}
        onClick={() => !isDraggable && onMatchClick && onMatchClick(match)}
      >
        {isDraggable && (
          <div className="absolute top-2 right-2 z-10 bg-gray-800/80 rounded p-1">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <div className="space-y-1 p-2">
          {renderTeamSlot(match, 'home', match.home_team_id, homeWins, match.id)}
          {renderTeamSlot(match, 'away', match.away_team_id, awayWins, match.id)}
        </div>
        
        <motion.div 
          className={`px-2 py-1.5 text-center backdrop-blur-sm relative overflow-hidden`}
          style={{
            background: `linear-gradient(to right, ${theme.accentColor}15, ${theme.accentColor}25, ${theme.accentColor}15)`,
            borderTop: `1px solid ${theme.accentColor}30`
          }}
          whileHover={{ 
            background: `linear-gradient(to right, ${theme.accentColor}25, ${theme.accentColor}35, ${theme.accentColor}25)`
          }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.accentColor}20, transparent)`
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <span className={`text-[10px] font-bold tracking-wider relative z-10`} style={{ color: theme.accentColor }}>
            {match.required_wins > 1 ? `BEST OF ${(match.required_wins * 2) - 1}` : 'SINGLE GAME'}
          </span>
        </motion.div>
      </motion.div>
    );

    return matchCard;
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

  const getRoundLabel = (roundName) => {
    return roundName.replace(/_/g, ' ').toUpperCase();
  };

  const hasAllTeamsSeeded = matches.filter(m => m.round_name === roundOrder[0]).every(m => m.home_team_id && m.away_team_id);

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

  const handleConnectMatches = (fromId, toId) => {
    if (fromId === toId) return;
    const existingConnector = connectors.find(c => c.from === fromId && c.to === toId);
    if (!existingConnector) {
      setConnectors([...connectors, { from: fromId, to: toId }]);
    }
    setConnectingFrom(null);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-950 via-blue-950/30 to-gray-950 rounded-2xl p-4 md:p-6 backdrop-blur-xl relative overflow-hidden"
          style={{
            border: `1px solid ${theme.accentColor}30`,
            boxShadow: `0 0 40px ${theme.accentColor}10, inset 0 1px 0 rgba(255,255,255,0.05)`
          }}
        >
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${theme.accentColor}20, transparent 70%)`
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Trophy 
                  className="w-6 h-6 md:w-7 md:h-7" 
                  style={{ 
                    color: theme.accentColor,
                    filter: `drop-shadow(0 0 8px ${theme.accentColor})`
                  }}
                />
              </motion.div>
              <div>
                <motion.h2 
                  className="text-xl md:text-2xl font-black text-white tracking-tight"
                  style={{
                    textShadow: `0 0 20px ${theme.accentColor}60`
                  }}
                >
                  {tournament.name}
                </motion.h2>
                <p className="text-xs font-bold mt-1 tracking-wider" style={{ color: `${theme.accentColor}` }}>
                  {tournament.sport.toUpperCase()} • {tournament.num_teams} TEAMS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-gray-900/60 backdrop-blur-sm rounded-xl p-1.5 border" style={{ borderColor: `${theme.accentColor}30` }}>
                <Palette className="w-3 h-3 ml-1" style={{ color: theme.accentColor }} />
                {Object.keys(THEME_OPTIONS).map((themeName) => (
                  <motion.button
                    key={themeName}
                    onClick={() => setSelectedTheme(themeName)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedTheme === themeName 
                        ? `bg-gradient-to-r ${THEME_OPTIONS[themeName].primary} text-white shadow-lg` 
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={selectedTheme === themeName ? {
                      boxShadow: `0 0 20px ${THEME_OPTIONS[themeName].accentColor}60`
                    } : {}}
                  >
                    {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                  </motion.button>
                ))}
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => setManualMode(!manualMode)}
                  variant="outline"
                  className="text-xs font-bold backdrop-blur-sm"
                  style={{
                    borderColor: `${theme.accentColor}40`,
                    color: theme.accentColor
                  }}
                >
                  {manualMode ? '🤖 Auto Mode' : '✋ Manual Mode'}
                </Button>
              </motion.div>
              <motion.div
                animate={{
                  boxShadow: [`0 0 10px ${theme.accentColor}40`, `0 0 20px ${theme.accentColor}60`, `0 0 10px ${theme.accentColor}40`]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Badge 
                  className={`text-xs md:text-sm px-4 md:px-6 py-2 bg-gradient-to-r ${theme.primary} text-white font-black border-0`}
                  style={{
                    boxShadow: `0 4px 20px ${theme.accentColor}40`
                  }}
                >
                  {manualMode ? 'MANUAL BUILDER' : 'TOURNAMENT BRACKET'}
                </Badge>
              </motion.div>
              {canEdit && hasAllTeamsSeeded && onSave && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={onSave}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-sm"
                    style={{
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Save Bracket</span>
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        <div className={`${canEdit && availableTeams.length > 0 ? 'grid lg:grid-cols-[280px,1fr] gap-6' : ''}`}>
          {canEdit && availableTeams.length > 0 && (
            <motion.div 
              className="bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden"
              style={{
                border: `1px solid ${theme.accentColor}30`,
                boxShadow: `0 0 30px ${theme.accentColor}10`
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <motion.div
                className="absolute inset-0 opacity-10"
                style={{
                  background: `radial-gradient(circle at 0% 0%, ${theme.accentColor}30, transparent 70%)`
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.05, 0.15, 0.05]
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2 relative z-10" style={{ textShadow: `0 0 15px ${theme.accentColor}60` }}>
                <GripVertical className="w-5 h-5" style={{ color: theme.accentColor }} />
                Available Teams
              </h3>
              <Droppable droppableId="available-teams">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 relative z-10"
                  >
                    {availableTeams.map((team, index) => (
                      <Draggable key={team.id} draggableId={`available-${team.id}`} index={index}>
                        {(provided, snapshot) => (
                          <motion.div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            whileHover={{ 
                              scale: 1.02,
                              boxShadow: `0 0 20px ${theme.accentColor}40`
                            }}
                            className={`flex items-center gap-2 px-3 py-2 bg-gray-900/60 border-2 rounded-xl backdrop-blur-sm transition-all ${
                              snapshot.isDragging ? 'shadow-2xl scale-105' : ''
                            }`}
                            style={{
                              borderColor: snapshot.isDragging ? theme.accentColor : `${theme.accentColor}30`,
                              boxShadow: snapshot.isDragging ? `0 10px 40px ${theme.accentColor}60` : 'none'
                            }}
                          >
                            <GripVertical className="w-4 h-4 text-gray-500" />
                            <motion.div 
                              className="w-1 h-6 rounded-full"
                              style={{ 
                                background: `linear-gradient(to bottom, ${theme.accentColor}, ${theme.accentColor}60)`,
                                boxShadow: `0 0 8px ${theme.accentColor}`
                              }}
                              animate={{ opacity: [0.6, 1, 0.6] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <motion.div whileHover={{ scale: 1.1, rotate: 5 }}>
                              <Avatar className="w-6 h-6 border-2" style={{ borderColor: `${theme.accentColor}60` }}>
                                <AvatarImage src={team.logo_url} />
                                <AvatarFallback 
                                  className="text-white text-xs font-bold"
                                  style={{ 
                                    background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}80)`
                                  }}
                                >
                                  {team.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </motion.div>
                            <span className="text-sm font-bold text-white uppercase flex-1 truncate">
                              {team.name}
                            </span>
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <p className="text-xs mt-4 font-bold tracking-wider relative z-10" style={{ color: `${theme.accentColor}80` }}>
                ⚡ Drag teams to bracket slots
              </p>
            </motion.div>
          )}

          <div 
            className="bg-gradient-to-br from-gray-950 via-indigo-950/30 to-gray-950 rounded-2xl p-4 md:p-8 backdrop-blur-xl shadow-2xl overflow-x-auto relative"
            style={{
              border: `1px solid ${theme.accentColor}20`,
              boxShadow: `0 0 60px ${theme.accentColor}10, inset 0 1px 0 rgba(255,255,255,0.03)`
            }}
          >
            <motion.div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, ${theme.accentColor} 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
              }}
            />
            {manualMode ? (
              <div className="space-y-4">
                <div className="flex gap-3 flex-wrap items-center">
                  <Button 
                    onClick={handleAddManualMatch}
                    className={`bg-gradient-to-r ${theme.primary} hover:opacity-90 text-white font-bold`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Match Card
                  </Button>
                  {connectingFrom && (
                    <Button 
                      onClick={() => setConnectingFrom(null)}
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold"
                    >
                      Cancel Connection
                    </Button>
                  )}
                  {manualMatches.length > 0 && onSave && (
                    <Button 
                      onClick={() => onSave({ manualMatches, connectors })}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Manual Bracket
                    </Button>
                  )}
                  <div className={`px-4 py-2 rounded-lg border ${connectingFrom ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800 border-gray-700'}`}>
                    <span className="text-sm font-semibold text-gray-300">
                      {connectingFrom ? '🔗 Click target match to connect' : '💡 Select match → Connect → Select target'}
                    </span>
                  </div>
                </div>
                
                <div className="relative" style={{ minHeight: '600px', minWidth: '1000px' }}>
                  {manualMatches.map((match) => (
                    <ManualMatchCard
                      key={match.id}
                      match={match}
                      theme={theme}
                      teams={teams}
                      getTeam={getTeam}
                      renderTeamSlot={renderTeamSlot}
                      onDrag={handleManualMatchDrag}
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
                      
                      const x1 = fromMatch.position.x + 240;
                      const y1 = fromMatch.position.y + 50;
                      const x2 = toMatch.position.x;
                      const y2 = toMatch.position.y + 50;
                      const midX = (x1 + x2) / 2;
                      
                      return (
                        <g key={idx}>
                          <path
                            d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
                            stroke={theme.connector}
                            strokeWidth="3"
                            fill="none"
                          />
                          <circle cx={x2} cy={y2} r="5" fill={theme.connector} />
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
// Formula: gap[i] = 2^i * BASE_GAP + (2^i - 1) * MATCH_HEIGHT
const matchGap = Math.pow(2, roundIdx) * BASE_GAP + (Math.pow(2, roundIdx) - 1) * MATCH_HEIGHT;

// Calculate vertical offset to center first match on merge point from previous round
let topOffset = 0;
if (roundIdx > 0) {
  // Position first match center at the merge point of first pair from previous round
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
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: roundIdx * 0.1 }}
                    >
                      <motion.div 
                        className="mb-8 text-center relative z-10"
                        whileHover={{ scale: 1.08 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <motion.div 
                          className={`bg-gradient-to-r ${theme.primary} rounded-xl px-6 py-3 inline-block backdrop-blur-sm relative overflow-hidden`}
                          style={{
                            boxShadow: `0 0 30px ${theme.accentColor}50, 0 8px 20px rgba(0,0,0,0.4)`
                          }}
                          animate={{
                            boxShadow: [
                              `0 0 20px ${theme.accentColor}40, 0 8px 20px rgba(0,0,0,0.4)`,
                              `0 0 40px ${theme.accentColor}60, 0 8px 20px rgba(0,0,0,0.4)`,
                              `0 0 20px ${theme.accentColor}40, 0 8px 20px rgba(0,0,0,0.4)`
                            ]
                          }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <motion.div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(90deg, transparent, ${theme.accentColor}30, transparent)`
                            }}
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          />
                          <h3 className="text-sm font-black text-white uppercase tracking-widest relative z-10" style={{ textShadow: `0 0 10px rgba(0,0,0,0.5)` }}>
                            {getRoundLabel(roundName)}
                          </h3>
                          <p className="text-[10px] font-bold mt-1 tracking-wider relative z-10" style={{ color: `${theme.accentColor}`, textShadow: `0 0 10px ${theme.accentColor}80` }}>
                            {matchCount} {matchCount === 1 ? 'Match' : 'Matches'}
                          </p>
                        </motion.div>
                      </motion.div>

                      <Droppable droppableId={`round-${roundName}`} type="MATCH">
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex flex-col relative ${snapshot.isDraggingOver ? 'rounded-2xl border-2' : ''}`}
                            style={snapshot.isDraggingOver ? {
                              background: `${theme.accentColor}10`,
                              borderColor: theme.accentColor,
                              boxShadow: `0 0 30px ${theme.accentColor}30`
                            } : {}} 
                            style={{ 
                              gap: `${matchGap}px`, 
                              marginTop: `${topOffset}px`,
                              minHeight: `${sortedMatches.length * MATCH_HEIGHT + (sortedMatches.length - 1) * matchGap}px`,
                              paddingBottom: '20px'
                            }}
                          >
                            {sortedMatches.map((match, matchIdx) => {
                              const isPairFirst = matchIdx % 2 === 0;
                              const shouldDrawConnector = roundIdx < roundOrder.length - 1;
                              const isFinals = roundName === 'finals';

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
                                      className={`relative ${dragSnapshot.isDragging ? 'z-50 rotate-2 opacity-80' : ''}`} 
                                      style={{ 
                                        height: `${MATCH_HEIGHT}px`,
                                        ...dragProvided.draggableProps.style
                                      }}
                                    >
                                      {renderMatch(match, canEdit)}

                                      {/* Outgoing connectors for all rounds */}
                                      {!dragSnapshot.isDragging && shouldDrawConnector && (
                                        <>
                                          {isPairFirst && (
                                            <svg 
                                              className="absolute pointer-events-none" 
                                              style={{
                                                left: '240px',
                                                top: `${MATCH_HEIGHT / 2}px`,
                                                width: '100px',
                                                height: `${matchGap / 2 + MATCH_HEIGHT / 2}px`,
                                                overflow: 'visible',
                                                zIndex: 1
                                              }}
                                            >
                                              {/* Horizontal line out from this match */}
                                              <line x1="0" y1="0" x2="50" y2="0" stroke={theme.connector} strokeWidth="3" strokeLinecap="round" />
                                              {/* Vertical down to merge point */}
                                              <line x1="50" y1="0" x2="50" y2={matchGap / 2 + MATCH_HEIGHT / 2} stroke={theme.connector} strokeWidth="3" strokeLinecap="round" />
                                              {/* Merged line to next round */}
                                              <line x1="50" y1={matchGap / 2 + MATCH_HEIGHT / 2} x2="100" y2={matchGap / 2 + MATCH_HEIGHT / 2} stroke={theme.connector} strokeWidth="3" strokeLinecap="round" />
                                              {/* Glow effect */}
                                              <line x1="0" y1="0" x2="50" y2="0" stroke={theme.accentColor} strokeWidth="6" opacity="0.3" strokeLinecap="round" filter="blur(4px)" />
                                              <line x1="50" y1="0" x2="50" y2={matchGap / 2 + MATCH_HEIGHT / 2} stroke={theme.accentColor} strokeWidth="6" opacity="0.3" strokeLinecap="round" filter="blur(4px)" />
                                              <line x1="50" y1={matchGap / 2 + MATCH_HEIGHT / 2} x2="100" y2={matchGap / 2 + MATCH_HEIGHT / 2} stroke={theme.accentColor} strokeWidth="6" opacity="0.3" strokeLinecap="round" filter="blur(4px)" />
                                            </svg>
                                          )}
                                          {!isPairFirst && (
                                            <svg 
                                              className="absolute pointer-events-none" 
                                              style={{
                                                left: '240px',
                                                top: `${MATCH_HEIGHT / 2 - (matchGap / 2 + MATCH_HEIGHT / 2)}px`,
                                                width: '50px',
                                                height: `${matchGap / 2 + MATCH_HEIGHT / 2}px`,
                                                overflow: 'visible',
                                                zIndex: 1
                                              }}
                                            >
                                              {/* Horizontal line out from this match */}
                                              <line x1="0" y1={matchGap / 2 + MATCH_HEIGHT / 2} x2="50" y2={matchGap / 2 + MATCH_HEIGHT / 2} stroke={theme.connector} strokeWidth="3" strokeLinecap="round" />
                                              {/* Vertical up to merge point */}
                                              <line x1="50" y1={matchGap / 2 + MATCH_HEIGHT / 2} x2="50" y2="0" stroke={theme.connector} strokeWidth="3" strokeLinecap="round" />
                                              {/* Glow effect */}
                                              <line x1="0" y1={matchGap / 2 + MATCH_HEIGHT / 2} x2="50" y2={matchGap / 2 + MATCH_HEIGHT / 2} stroke={theme.accentColor} strokeWidth="6" opacity="0.3" strokeLinecap="round" filter="blur(4px)" />
                                              <line x1="50" y1={matchGap / 2 + MATCH_HEIGHT / 2} x2="50" y2="0" stroke={theme.accentColor} strokeWidth="6" opacity="0.3" strokeLinecap="round" filter="blur(4px)" />
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
style={{ 
                    marginTop: (() => {
                      if (roundOrder.length === 1) return '50px';
                      // Calculate cumulative offset for finals round
                      const MATCH_HEIGHT = 100;
                      const BASE_GAP = 80;
                      let cumulativeOffset = 0;
                      const finalsRoundIdx = roundOrder.length - 1;
                      for (let i = 0; i < finalsRoundIdx; i++) {
                        const gapAtLevel = BASE_GAP * Math.pow(2, i);
                        cumulativeOffset += (MATCH_HEIGHT + gapAtLevel) / 2;
                      }
                      // Add half match height to center on the finals card
                      return `${cumulativeOffset + (MATCH_HEIGHT / 2)}px`;
                    })()
                  }}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ 
                        rotate: [0, -10, 10, -10, 0],
                        scale: [1, 1.15, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    >
                      <Trophy 
                        className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4" 
                        style={{ 
                          color: '#FFD700',
                          filter: 'drop-shadow(0 0 15px #FFD700)'
                        }}
                      />
                    </motion.div>
                    <motion.div 
                      className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-2xl p-4 md:p-6 border-4 border-yellow-300 w-[200px] md:w-[240px] relative overflow-hidden"
                      whileHover={{ scale: 1.08, rotate: 3 }}
                      style={{
                        boxShadow: '0 0 60px rgba(255, 215, 0, 0.6), 0 20px 40px rgba(0,0,0,0.4)'
                      }}
                    >
                      <motion.div 
                        className="absolute inset-0"
                        style={{
                          background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)'
                        }}
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.3, 0.6, 0.3] 
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <Avatar className="w-16 h-16 md:w-20 md:h-20 mx-auto border-4 border-white shadow-2xl mb-3 relative z-10">
                        <AvatarImage src={champion.logo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xl md:text-2xl font-black">
                          {champion.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <motion.h3 
                        className="text-base md:text-lg font-black text-white uppercase mb-2 relative z-10"
                        style={{ 
                          textShadow: '0 2px 10px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)'
                        }}
                        animate={{
                          textShadow: [
                            '0 2px 10px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)',
                            '0 2px 10px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.5)',
                            '0 2px 10px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)'
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {champion.name}
                      </motion.h3>
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Badge 
                          className="bg-white text-yellow-700 font-black text-xs md:text-sm px-3 md:px-4 py-1 relative z-10"
                          style={{
                            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.5)'
                          }}
                        >
                          🏆 CHAMPION 🏆
                        </Badge>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}

function ManualMatchCard({ match, theme, teams, getTeam, renderTeamSlot, onDrag, onDelete, onConnect, isConnecting, isSelected, onSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest('.action-button')) return;
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        position: 'absolute',
        left: `${match.position.x}px`,
        top: `${match.position.y}px`,
        zIndex: isDragging ? 100 : isSelected ? 50 : 1
      }}
      className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
    >
      <div className={`bg-gray-900 rounded-lg border-2 ${isConnecting ? 'border-blue-500 shadow-2xl' : isSelected ? 'border-purple-500' : 'border-gray-800'} overflow-hidden hover:border-${theme.accent}-600 transition-all`} style={{ width: '240px' }}>
        <div className="absolute top-2 right-2 flex gap-1 z-10 action-button">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConnect();
            }}
            className={`p-1.5 ${isConnecting ? 'bg-blue-600' : 'bg-gray-800/80'} hover:bg-${theme.accent}-600 rounded transition-colors`}
            title="Connect to another match"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(match.id);
            }}
            className="p-1.5 bg-gray-800/80 hover:bg-red-600 rounded transition-colors"
            title="Delete match"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </div>
        <div className="space-y-1 p-2 pt-10">
          {renderTeamSlot(match, 'home', match.home_team_id, false, match.id)}
          {renderTeamSlot(match, 'away', match.away_team_id, false, match.id)}
        </div>
        <div className={`px-2 py-1.5 bg-${theme.accent}-900/30 border-t border-${theme.accent}-800/50 text-center`}>
          <span className={`text-[10px] text-${theme.accent}-400 font-bold`}>
            {match.required_wins > 1 ? `BEST OF ${(match.required_wins * 2) - 1}` : 'SINGLE GAME'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}