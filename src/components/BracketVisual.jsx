import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, GripVertical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BracketVisual({ tournament, matches, teams, onMatchClick, onTeamDrop, onSave, canEdit = true }) {
  const getTeam = (teamId) => teams.find(t => t.id === teamId);

  // Get teams already in bracket
  const teamsInBracket = new Set();
  matches.forEach(match => {
    if (match.home_team_id) teamsInBracket.add(match.home_team_id);
    if (match.away_team_id) teamsInBracket.add(match.away_team_id);
  });

  // Available teams not yet in bracket
  const availableTeams = teams.filter(t => 
    t.sport === tournament.sport && 
    (!tournament.division || t.division === tournament.division) &&
    !teamsInBracket.has(t.id)
  );

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // Parse IDs
    const sourceId = source.droppableId;
    const destId = destination.droppableId;
    
    // Dragging from available teams to bracket
    if (sourceId === 'available-teams' && destId.startsWith('match-')) {
      const parts = destId.split('-');
      const matchId = parts[1];
      const slot = parts[2]; // 'home' or 'away'
      const teamId = availableTeams[source.index].id;
      
      onTeamDrop(matchId, slot, teamId);
    }
    // Swapping teams within bracket
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
              className={`flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed rounded-lg transition-all min-h-[44px] ${
                snapshot.isDraggingOver 
                  ? 'border-blue-400 bg-blue-900/40 scale-[1.02] shadow-lg' 
                  : 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-900/70'
              }`}
            >
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">TBD</span>
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
                  className={`flex items-center gap-2.5 px-3 py-2.5 border-2 rounded-lg transition-all ${
                    snapshot.isDragging ? 'shadow-2xl scale-110 z-50 bg-blue-700 border-blue-400' : ''
                  } ${
                    isWinner 
                      ? 'bg-gradient-to-r from-green-700 to-green-600 border-green-500 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-gray-800 to-gray-850 border-gray-700 text-gray-100 hover:from-gray-750 hover:to-gray-800 hover:border-gray-600'
                  } ${isEditable ? 'cursor-move' : 'cursor-pointer'}`}
                >
                  {isEditable && (
                    <div {...provided.dragHandleProps}>
                      <GripVertical className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  )}
                  <div className="w-1 h-7 bg-blue-500 rounded-full"></div>
                  <Avatar className="w-7 h-7 border-2 border-gray-600 shadow-md">
                    <AvatarImage src={team.logo_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-[10px] font-black">
                      {team.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-black uppercase flex-1 truncate tracking-wide">
                    {team.name}
                  </span>
                  {isWinner && <Trophy className="w-4 h-4 text-yellow-400" />}
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
        className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-lg border-2 border-gray-800 overflow-hidden transition-all hover:border-blue-600 hover:shadow-xl hover:scale-[1.02] cursor-pointer w-[240px]"
        onClick={() => onMatchClick && onMatchClick(match)}
      >
        <div className="space-y-1.5 p-2">
          {renderTeamSlot(match, 'home', match.home_team_id, homeWins, match.id)}
          {renderTeamSlot(match, 'away', match.away_team_id, awayWins, match.id)}
        </div>
        
        <div className="px-2 py-1.5 bg-blue-950/30 border-t border-blue-900/50 text-center">
          <span className="text-[10px] text-blue-400 font-bold tracking-wide">
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
        {/* Header with Save Button */}
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
              <Badge className="text-sm px-4 py-1.5 bg-blue-600 text-white font-black uppercase">
                Tournament Bracket
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

        <div className={`${canEdit && availableTeams.length > 0 ? 'grid lg:grid-cols-[300px,1fr] gap-6' : ''}`}>
          {/* Available Teams List */}
          {canEdit && availableTeams.length > 0 && (
            <div className="bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 rounded-xl p-6 border-2 border-purple-900/50 shadow-xl">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-purple-500" />
                Available Teams
              </h3>
              <Droppable droppableId="available-teams">
                {(provided, snapshot) => (
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
                            className={`flex items-center gap-2 px-3 py-2.5 bg-gray-900 border-2 border-gray-700 rounded-lg transition-all ${
                              snapshot.isDragging ? 'shadow-2xl scale-105 border-blue-500 bg-blue-900' : 'hover:border-gray-600 hover:bg-gray-850'
                            }`}
                          >
                            <GripVertical className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div className="w-1.5 h-7 bg-purple-500 rounded"></div>
                            <Avatar className="w-7 h-7 border border-gray-600">
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
                Drag teams to empty bracket slots to seed the tournament
              </p>
            </div>
          )}

          {/* Bracket */}
          <div className="bg-gradient-to-br from-gray-950 via-indigo-950/30 to-gray-950 rounded-xl p-8 border-2 border-blue-900/50 shadow-2xl overflow-x-auto">
            <div className="flex gap-24 pb-6 relative" style={{ minWidth: 'max-content' }}>
              {roundOrder.map((roundName, roundIdx) => {
                const roundMatches = matchesByRound[roundName] || [];
                if (roundMatches.length === 0) return null;
                
                const sortedMatches = [...roundMatches].sort((a, b) => a.match_number - b.match_number);
                const spacingMultiplier = Math.pow(2, roundIdx);
                
                const isLastRound = roundIdx === roundOrder.length - 1;
                
                return (
                  <div key={roundName} className="flex flex-col relative">
                    <div className="mb-8 text-center">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-6 py-3 shadow-lg inline-block">
                        <h3 className="text-base font-black text-white uppercase tracking-widest">
                          {getRoundLabel(roundName)}
                        </h3>
                        <p className="text-[10px] text-blue-200 font-bold mt-1">
                          {sortedMatches.length} {sortedMatches.length === 1 ? 'Match' : 'Matches'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-around" style={{ flex: 1 }}>
                      {sortedMatches.map((match, matchIdx) => {
                        const nextRoundName = roundOrder[roundIdx + 1];
                        const nextRoundMatches = matchesByRound[nextRoundName] || [];
                        const nextMatch = nextRoundMatches[Math.floor(matchIdx / 2)];
                        
                        return (
                          <div 
                            key={match.id}
                            className="relative"
                            style={{
                              marginTop: matchIdx === 0 ? '0' : `${spacingMultiplier * 2.5}rem`
                            }}
                          >
                            {renderMatch(match)}
                            
                            {/* Connector lines */}
                            {!isLastRound && nextMatch && (
                              <svg 
                                className="absolute left-full top-1/2 pointer-events-none" 
                                style={{ 
                                  width: '96px', 
                                  height: matchIdx % 2 === 0 ? `${(spacingMultiplier * 2.5 * 16) + 100}px` : '100px',
                                  transform: 'translateY(-50%)'
                                }}
                              >
                                {matchIdx % 2 === 0 ? (
                                  // Upper match - line goes right then down
                                  <>
                                    <line x1="0" y1="50%" x2="48" y2="50%" stroke="#3b82f6" strokeWidth="3" />
                                    <line x1="48" y1="50%" x2="48" y2="100%" stroke="#3b82f6" strokeWidth="3" />
                                    <line x1="48" y1="100%" x2="96" y2="100%" stroke="#3b82f6" strokeWidth="3" />
                                  </>
                                ) : (
                                  // Lower match - line goes right then up
                                  <>
                                    <line x1="0" y1="50%" x2="48" y2="50%" stroke="#3b82f6" strokeWidth="3" />
                                    <line x1="48" y1="50%" x2="48" y2="0" stroke="#3b82f6" strokeWidth="3" />
                                    <line x1="48" y1="0" x2="96" y2="0" stroke="#3b82f6" strokeWidth="3" />
                                  </>
                                )}
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {champion && (
                <div className="flex items-center pl-8">
                  <div className="text-center">
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
                    <div className="bg-gradient-to-br from-yellow-500 via-yellow-600 to-orange-600 rounded-xl p-6 border-4 border-yellow-400 shadow-2xl w-[240px] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 to-transparent"></div>
                      <Avatar className="w-20 h-20 mx-auto border-4 border-white shadow-2xl mb-3 relative z-10">
                        <AvatarImage src={champion.logo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-2xl font-black">
                          {champion.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-lg font-black text-white uppercase mb-2 relative z-10 tracking-wide">
                        {champion.name}
                      </h3>
                      <Badge className="bg-white text-yellow-700 font-black text-sm px-4 py-1.5 shadow-lg relative z-10">
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