import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, GripVertical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BracketVisual({ tournament, matches, teams, onMatchClick, onTeamDrop, onSave, canEdit = true }) {
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
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed rounded-lg transition-all ${
                snapshot.isDraggingOver 
                  ? 'border-blue-400 bg-blue-900/40' 
                  : 'border-gray-700 bg-gray-900/50'
              }`}
            >
              <span className="text-xs text-gray-500 font-semibold">TBD</span>
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
            className={snapshot.isDraggingOver ? 'ring-2 ring-blue-400 rounded-lg' : ''}
          >
            <Draggable draggableId={`team-${teamId}-${matchId}-${slot}`} index={0} isDragDisabled={!isEditable}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  className={`flex items-center gap-2 px-3 py-2 border-2 rounded-lg transition-all ${
                    snapshot.isDragging ? 'shadow-2xl scale-105 bg-blue-700 border-blue-400' : ''
                  } ${
                    isWinner 
                      ? 'bg-gradient-to-r from-green-700 to-green-600 border-green-500 text-white' 
                      : 'bg-gray-800 border-gray-700 text-gray-100'
                  } ${isEditable ? 'cursor-move' : 'cursor-pointer'}`}
                >
                  {isEditable && (
                    <div {...provided.dragHandleProps}>
                      <GripVertical className="w-3 h-3 text-gray-500" />
                    </div>
                  )}
                  <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                  <Avatar className="w-6 h-6 border border-gray-600">
                    <AvatarImage src={team.logo_url} />
                    <AvatarFallback className="bg-blue-600 text-white text-[9px] font-bold">
                      {team.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-bold uppercase flex-1 truncate">
                    {team.name}
                  </span>
                  {isWinner && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
                </div>
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
      <div 
        className="bg-gray-900 rounded-lg border-2 border-gray-800 overflow-hidden hover:border-blue-600 transition-all cursor-pointer"
        style={{ width: '240px' }}
        onClick={() => onMatchClick && onMatchClick(match)}
      >
        <div className="space-y-1 p-2">
          {renderTeamSlot(match, 'home', match.home_team_id, homeWins, match.id)}
          {renderTeamSlot(match, 'away', match.away_team_id, awayWins, match.id)}
        </div>
        
        <div className="px-2 py-1.5 bg-blue-900/30 border-t border-blue-800/50 text-center">
          <span className="text-[10px] text-blue-400 font-bold">
            {match.required_wins > 1 ? `BEST OF ${(match.required_wins * 2) - 1}` : 'SINGLE GAME'}
          </span>
        </div>
      </div>
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
        <div className="bg-gradient-to-br from-gray-950 via-blue-950/20 to-gray-950 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-7 h-7 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-black text-white">
                  {tournament.name}
                </h2>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  {tournament.sport.toUpperCase()} • {tournament.num_teams} TEAMS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="text-sm px-4 py-1.5 bg-blue-600 text-white font-black">
                TOURNAMENT BRACKET
              </Badge>
              {canEdit && hasAllTeamsSeeded && onSave && (
                <Button 
                  onClick={onSave}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Bracket
                </Button>
              )}
            </div>
          </div>
        </div>

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

          <div className="bg-gradient-to-br from-gray-950 via-indigo-950/20 to-gray-950 rounded-xl p-8 border border-gray-800 shadow-2xl overflow-x-auto">
            <div className="flex gap-20 relative" style={{ minWidth: 'max-content' }}>
              {roundOrder.map((roundName, roundIdx) => {
                const roundMatches = matchesByRound[roundName] || [];
                if (roundMatches.length === 0) return null;
                
                const sortedMatches = [...roundMatches].sort((a, b) => a.match_number - b.match_number);
                const matchCount = sortedMatches.length;
                const spacingMultiplier = Math.pow(2, roundIdx);
                const matchGap = 140 * spacingMultiplier;
                
                return (
                  <div key={roundName} className="flex flex-col">
                    <div className="mb-8 text-center">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-6 py-3 shadow-lg inline-block">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">
                          {getRoundLabel(roundName)}
                        </h3>
                        <p className="text-[10px] text-blue-200 font-semibold mt-1">
                          {matchCount} {matchCount === 1 ? 'Match' : 'Matches'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col relative" style={{ gap: `${matchGap}px` }}>
                      {sortedMatches.map((match, matchIdx) => (
                        <div key={match.id} className="relative">
                          {renderMatch(match)}
                          
                          {roundIdx < roundOrder.length - 1 && (
                            <svg 
                              className="absolute pointer-events-none" 
                              style={{
                                left: '100%',
                                top: '50%',
                                width: '80px',
                                height: matchIdx % 2 === 0 ? `${matchGap + 100}px` : '2px',
                                transform: 'translateY(-50%)',
                                overflow: 'visible'
                              }}
                            >
                              {matchIdx % 2 === 0 ? (
                                <g>
                                  <line x1="0" y1="0" x2="40" y2="0" stroke="rgba(96, 165, 250, 0.5)" strokeWidth="2" />
                                  <line x1="40" y1="0" x2="40" y2={matchGap / 2 + 50} stroke="rgba(96, 165, 250, 0.5)" strokeWidth="2" />
                                  <line x1="40" y1={matchGap / 2 + 50} x2="80" y2={matchGap / 2 + 50} stroke="rgba(96, 165, 250, 0.5)" strokeWidth="2" />
                                </g>
                              ) : (
                                <g>
                                  <line x1="0" y1="0" x2="40" y2="0" stroke="rgba(96, 165, 250, 0.5)" strokeWidth="2" />
                                  <line x1="40" y1="0" x2="40" y2={-(matchGap / 2 + 50)} stroke="rgba(96, 165, 250, 0.5)" strokeWidth="2" />
                                </g>
                              )}
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {champion && (
                <div className="flex items-center pl-8" style={{ alignSelf: 'center' }}>
                  <div className="text-center">
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <div className="bg-gradient-to-br from-yellow-500 via-yellow-600 to-orange-600 rounded-xl p-6 border-4 border-yellow-400 shadow-2xl w-[240px] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 to-transparent"></div>
                      <Avatar className="w-20 h-20 mx-auto border-4 border-white shadow-2xl mb-3 relative z-10">
                        <AvatarImage src={champion.logo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-2xl font-black">
                          {champion.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-lg font-black text-white uppercase mb-2 relative z-10">
                        {champion.name}
                      </h3>
                      <Badge className="bg-white text-yellow-700 font-black text-sm px-4 py-1 shadow-lg relative z-10">
                        🏆 CHAMPION 🏆
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}