import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, GripVertical, Save, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const THEME_OPTIONS = {
  default: {
    primary: 'from-blue-600 to-indigo-600',
    accent: 'blue',
    connector: 'rgba(96, 165, 250, 0.5)',
    matchBg: 'bg-gray-900',
    winnerBg: 'from-green-700 to-green-600 border-green-500'
  },
  ocean: {
    primary: 'from-cyan-600 to-teal-600',
    accent: 'cyan',
    connector: 'rgba(34, 211, 238, 0.5)',
    matchBg: 'bg-slate-900',
    winnerBg: 'from-emerald-700 to-teal-600 border-emerald-500'
  },
  sunset: {
    primary: 'from-orange-600 to-red-600',
    accent: 'orange',
    connector: 'rgba(251, 146, 60, 0.5)',
    matchBg: 'bg-gray-900',
    winnerBg: 'from-amber-700 to-orange-600 border-amber-500'
  },
  purple: {
    primary: 'from-purple-600 to-pink-600',
    accent: 'purple',
    connector: 'rgba(168, 85, 247, 0.5)',
    matchBg: 'bg-gray-900',
    winnerBg: 'from-fuchsia-700 to-pink-600 border-fuchsia-500'
  }
};

export default function BracketVisual({ tournament, matches, teams, onMatchClick, onTeamDrop, onSave, canEdit = true }) {
  const [selectedTheme, setSelectedTheme] = useState('default');
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
    
    if (sourceId === 'available-teams' && destId.startsWith('match-')) {
      const parts = destId.split('-');
      const matchId = parts[1];
      const slot = parts[2];
      const teamId = availableTeams[source.index].id;
      
      onTeamDrop(matchId, slot, teamId);
    }
    else if (sourceId.startsWith('match-') && destId.startsWith('match-')) {
      const sourceParts = sourceId.split('-');
      const destParts = destId.split('-');
      const sourceMatchId = sourceParts[1];
      const sourceSlot = sourceParts[2];
      const destMatchId = destParts[1];
      const destSlot = destParts[2];
      
      onTeamDrop(sourceMatchId, sourceSlot, destMatchId, destSlot);
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed rounded-lg transition-all ${
                snapshot.isDraggingOver 
                  ? `border-${theme.accent}-400 bg-${theme.accent}-900/40` 
                  : 'border-gray-700 bg-gray-900/50'
              }`}
            >
              <span className="text-xs text-gray-500 font-semibold">TBD</span>
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
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`flex items-center gap-2 px-3 py-2 border-2 rounded-lg transition-all duration-300 ${
                    snapshot.isDragging ? `shadow-2xl scale-105 bg-${theme.accent}-700 border-${theme.accent}-400` : ''
                  } ${
                    isWinner 
                      ? `bg-gradient-to-r ${theme.winnerBg} text-white animate-pulse` 
                      : 'bg-gray-800 border-gray-700 text-gray-100'
                  } ${isEditable ? 'cursor-move' : 'cursor-pointer'}`}
                >
                  {isEditable && (
                    <div {...provided.dragHandleProps}>
                      <GripVertical className="w-3 h-3 text-gray-500" />
                    </div>
                  )}
                  <motion.div 
                    className={`w-1 h-6 bg-${theme.accent}-500 rounded-full`}
                    animate={{ scale: [1, 1.2, 1] }}
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

  const renderMatch = (match) => {
    const isCompleted = match.status === 'completed';
    const homeWins = isCompleted && match.winner_team_id === match.home_team_id;
    const awayWins = isCompleted && match.winner_team_id === match.away_team_id;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.03, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`${theme.matchBg} rounded-lg border-2 border-gray-800 overflow-hidden hover:border-${theme.accent}-600 transition-all cursor-pointer`}
        style={{ width: '240px', minWidth: '200px' }}
        onClick={() => onMatchClick && onMatchClick(match)}
      >
        <div className="space-y-1 p-2">
          {renderTeamSlot(match, 'home', match.home_team_id, homeWins, match.id)}
          {renderTeamSlot(match, 'away', match.away_team_id, awayWins, match.id)}
        </div>
        
        <motion.div 
          className={`px-2 py-1.5 bg-${theme.accent}-900/30 border-t border-${theme.accent}-800/50 text-center`}
          whileHover={{ backgroundColor: `rgba(59, 130, 246, 0.2)` }}
        >
          <span className={`text-[10px] text-${theme.accent}-400 font-bold`}>
            {match.required_wins > 1 ? `BEST OF ${(match.required_wins * 2) - 1}` : 'SINGLE GAME'}
          </span>
        </motion.div>
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

  const getRoundLabel = (roundName) => {
    return roundName.replace(/_/g, ' ').toUpperCase();
  };

  const hasAllTeamsSeeded = matches.filter(m => m.round_name === roundOrder[0]).every(m => m.home_team_id && m.away_team_id);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-950 via-blue-950/20 to-gray-950 rounded-xl p-4 md:p-6 border border-gray-800"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 md:w-7 md:h-7 text-yellow-500" />
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white">
                  {tournament.name}
                </h2>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  {tournament.sport.toUpperCase()} • {tournament.num_teams} TEAMS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
                <Palette className="w-3 h-3 text-gray-400 ml-1" />
                {Object.keys(THEME_OPTIONS).map((themeName) => (
                  <button
                    key={themeName}
                    onClick={() => setSelectedTheme(themeName)}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                      selectedTheme === themeName 
                        ? `bg-gradient-to-r ${THEME_OPTIONS[themeName].primary} text-white` 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                  </button>
                ))}
              </div>
              <Badge className={`text-xs md:text-sm px-3 md:px-4 py-1.5 bg-gradient-to-r ${theme.primary} text-white font-black`}>
                TOURNAMENT BRACKET
              </Badge>
              {canEdit && hasAllTeamsSeeded && onSave && (
                <Button 
                  onClick={onSave}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Save Bracket</span>
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <div className={`${canEdit && availableTeams.length > 0 ? 'grid lg:grid-cols-[280px,1fr] gap-6' : ''}`}>
          {canEdit && availableTeams.length > 0 && (
            <div className="bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 rounded-xl p-6 border-2 border-purple-900/50">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-purple-500" />
                Available Teams
              </h3>
              <Droppable droppableId="available-teams">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {availableTeams.map((team, index) => (
                      <Draggable key={team.id} draggableId={`available-${team.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex items-center gap-2 px-3 py-2 bg-gray-900 border-2 border-gray-700 rounded-lg transition-all ${
                              snapshot.isDragging ? 'shadow-2xl scale-105 border-blue-500 bg-blue-900' : 'hover:border-gray-600'
                            }`}
                          >
                            <GripVertical className="w-4 h-4 text-gray-500" />
                            <div className="w-1 h-6 bg-purple-500 rounded"></div>
                            <Avatar className="w-6 h-6 border border-gray-600">
                              <AvatarImage src={team.logo_url} />
                              <AvatarFallback className="bg-purple-600 text-white text-xs font-bold">
                                {team.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-bold text-white uppercase flex-1 truncate">
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
              <p className="text-xs text-gray-500 mt-4 font-medium">
                Drag teams to bracket slots
              </p>
            </div>
          )}

          <div className="bg-gradient-to-br from-gray-950 via-indigo-950/20 to-gray-950 rounded-xl p-4 md:p-8 border border-gray-800 shadow-2xl overflow-x-auto">
            <div className="flex gap-20 relative pb-4" style={{ minWidth: 'max-content' }}>
              <AnimatePresence>
                {roundOrder.map((roundName, roundIdx) => {
                  const roundMatches = matchesByRound[roundName] || [];
                  if (roundMatches.length === 0) return null;

                  const sortedMatches = [...roundMatches].sort((a, b) => a.match_number - b.match_number);
                  const matchCount = sortedMatches.length;
                  const spacingMultiplier = Math.pow(2, roundIdx);
                  const MATCH_HEIGHT = 100;
                  const matchGap = MATCH_HEIGHT * spacingMultiplier;

                  return (
                    <motion.div 
                      key={roundName} 
                      className="flex flex-col"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: roundIdx * 0.1 }}
                    >
                      <motion.div 
                        className="mb-6 md:mb-8 text-center"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className={`bg-gradient-to-r ${theme.primary} rounded-lg px-4 md:px-6 py-2 md:py-3 shadow-lg inline-block`}>
                          <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-widest">
                            {getRoundLabel(roundName)}
                          </h3>
                          <p className={`text-[10px] text-${theme.accent}-200 font-semibold mt-1`}>
                            {matchCount} {matchCount === 1 ? 'Match' : 'Matches'}
                          </p>
                        </div>
                      </motion.div>

                      <div className="flex flex-col relative" style={{ gap: `${matchGap}px` }}>
                        {sortedMatches.map((match, matchIdx) => {
                          const isPairFirst = matchIdx % 2 === 0;
                          const shouldDrawConnector = roundIdx < roundOrder.length - 1;
                          const CONNECTOR_LENGTH = 80;
                          const HORIZONTAL_SEGMENT = 40;
                          const verticalSpan = matchGap + MATCH_HEIGHT;

                          return (
                            <div key={match.id} className="relative">
                              {renderMatch(match)}

                              {shouldDrawConnector && (
                                <svg 
                                  className="absolute pointer-events-none" 
                                  style={{
                                    left: '100%',
                                    top: '50%',
                                    width: `${CONNECTOR_LENGTH}px`,
                                    height: isPairFirst ? `${verticalSpan}px` : '1px',
                                    transform: 'translateY(-50%)',
                                    overflow: 'visible'
                                  }}
                                >
                                  {isPairFirst ? (
                                    <>
                                      <line x1="0" y1="0" x2={HORIZONTAL_SEGMENT} y2="0" stroke={theme.connector} strokeWidth="3" />
                                      <line x1={HORIZONTAL_SEGMENT} y1="0" x2={HORIZONTAL_SEGMENT} y2={verticalSpan / 2} stroke={theme.connector} strokeWidth="3" />
                                      <line x1={HORIZONTAL_SEGMENT} y1={verticalSpan / 2} x2={CONNECTOR_LENGTH} y2={verticalSpan / 2} stroke={theme.connector} strokeWidth="3" />
                                    </>
                                  ) : (
                                    <>
                                      <line x1="0" y1="0" x2={HORIZONTAL_SEGMENT} y2="0" stroke={theme.connector} strokeWidth="3" />
                                      <line x1={HORIZONTAL_SEGMENT} y1="0" x2={HORIZONTAL_SEGMENT} y2={-verticalSpan / 2} stroke={theme.connector} strokeWidth="3" />
                                    </>
                                  )}
                                </svg>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {champion && (
                <motion.div 
                  className="flex items-center pl-4 md:pl-8" 
                  style={{ alignSelf: 'center' }}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ 
                        rotate: [0, -10, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    >
                      <Trophy className="w-12 h-12 md:w-16 md:h-16 text-yellow-500 mx-auto mb-4" />
                    </motion.div>
                    <motion.div 
                      className="bg-gradient-to-br from-yellow-500 via-yellow-600 to-orange-600 rounded-xl p-4 md:p-6 border-4 border-yellow-400 shadow-2xl w-[200px] md:w-[240px] relative overflow-hidden"
                      whileHover={{ scale: 1.05, rotate: 2 }}
                    >
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 to-transparent"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <Avatar className="w-16 h-16 md:w-20 md:h-20 mx-auto border-4 border-white shadow-2xl mb-3 relative z-10">
                        <AvatarImage src={champion.logo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xl md:text-2xl font-black">
                          {champion.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-base md:text-lg font-black text-white uppercase mb-2 relative z-10">
                        {champion.name}
                      </h3>
                      <Badge className="bg-white text-yellow-700 font-black text-xs md:text-sm px-3 md:px-4 py-1 shadow-lg relative z-10">
                        🏆 CHAMPION 🏆
                      </Badge>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}