import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, GripVertical } from "lucide-react";

export default function BracketVisual({ tournament, matches, teams, onMatchClick, onTeamReorder }) {
  const getTeam = (teamId) => teams.find(t => t.id === teamId);

  const handleDragEnd = (result) => {
    if (!result.destination || !onTeamReorder) return;
    
    const { source, destination } = result;
    const sourceMatchId = source.droppableId.split('-')[1];
    const sourceSlot = source.droppableId.split('-')[2];
    const destMatchId = destination.droppableId.split('-')[1];
    const destSlot = destination.droppableId.split('-')[2];
    
    onTeamReorder(sourceMatchId, sourceSlot, destMatchId, destSlot);
  };

  const renderTeamSlot = (match, slot, teamId, isWinner, matchId) => {
    const team = getTeam(teamId);
    const isEditable = match.status === 'pending' || match.status === 'ready';
    
    if (!team) {
      return (
        <Droppable droppableId={`match-${matchId}-${slot}`} isDropDisabled={!isEditable}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded transition-all ${
                snapshot.isDraggingOver 
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' 
                  : 'border-gray-600 dark:border-gray-700 bg-gray-800 dark:bg-gray-900'
              }`}
            >
              <span className="text-xs text-gray-500 dark:text-gray-600 font-semibold uppercase">TBD</span>
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
            className={snapshot.isDraggingOver ? 'ring-2 ring-blue-400 rounded' : ''}
          >
            <Draggable draggableId={`team-${teamId}-${matchId}-${slot}`} index={0} isDragDisabled={!isEditable}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  className={`flex items-center gap-2 px-3 py-2 border-2 rounded transition-all ${
                    snapshot.isDragging ? 'shadow-2xl scale-105 z-50 bg-gray-700' : ''
                  } ${
                    isWinner 
                      ? 'bg-green-600 border-green-500 text-white' 
                      : 'bg-gray-800 dark:bg-gray-900 border-gray-700 dark:border-gray-800 text-gray-100'
                  } ${isEditable ? 'cursor-move hover:bg-gray-700' : 'cursor-pointer hover:bg-gray-700'}`}
                >
                  {isEditable && (
                    <div {...provided.dragHandleProps}>
                      <GripVertical className="w-3 h-3 text-gray-500" />
                    </div>
                  )}
                  <div className="w-1 h-6 bg-gray-100 rounded"></div>
                  <Avatar className="w-6 h-6 border border-gray-600">
                    <AvatarImage src={team.logo_url} />
                    <AvatarFallback className="bg-blue-600 text-white text-[10px] font-bold">
                      {team.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-bold uppercase flex-1 truncate">
                    {team.name}
                  </span>
                </div>
              )}
            </Draggable>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  const renderMatch = (match, roundIndex, matchIndex, matchesInRound) => {
    const isCompleted = match.status === 'completed';
    const homeWins = isCompleted && match.winner_team_id === match.home_team_id;
    const awayWins = isCompleted && match.winner_team_id === match.away_team_id;

    return (
      <div className="relative flex items-center">
        <div 
          className="bg-gray-900 dark:bg-black rounded border border-gray-700 dark:border-gray-800 overflow-hidden transition-all hover:border-blue-600 cursor-pointer min-w-[180px]"
          onClick={() => onMatchClick(match)}
        >
          <div className="space-y-0.5 p-1">
            {renderTeamSlot(match, 'home', match.home_team_id, homeWins, match.id)}
            {renderTeamSlot(match, 'away', match.away_team_id, awayWins, match.id)}
          </div>
          
          {match.required_wins > 1 && (
            <div className="px-2 py-0.5 bg-gray-950 border-t border-gray-800 text-center">
              <span className="text-[10px] text-gray-500 font-semibold">
                Best of {(match.required_wins * 2) - 1}
              </span>
            </div>
          )}
        </div>

        {/* Connector line to the right */}
        <div className="w-6 h-0.5 bg-gray-700 dark:bg-gray-800"></div>
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
    return roundName.replace(/_/g, ' ').toUpperCase().replace('ROUND OF ', 'ROUND OF ');
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="bg-gradient-to-br from-gray-950 via-blue-950/20 to-gray-950 rounded-xl p-6 border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800">
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
          <Badge className="text-sm px-4 py-1.5 bg-blue-600 text-white font-black uppercase">
            Tournament Bracket
          </Badge>
        </div>

        {/* Drag instruction */}
        {tournament.status !== 'completed' && (
          <div className="mb-6 bg-blue-950/30 border border-blue-800/50 rounded-lg p-3">
            <p className="text-xs text-blue-300 font-semibold flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              Drag and drop teams to rearrange matchups before scheduling games
            </p>
          </div>
        )}

        {/* Bracket Grid */}
        <div className="relative overflow-x-auto">
          <div className="flex gap-12 pb-6" style={{ minWidth: 'max-content' }}>
            {roundOrder.map((roundName, roundIdx) => {
              const roundMatches = matchesByRound[roundName] || [];
              if (roundMatches.length === 0) return null;
              
              const sortedMatches = [...roundMatches].sort((a, b) => a.match_number - b.match_number);
              const isLastRound = roundName === 'finals';
              
              // Calculate spacing between matches based on round
              const spacingMultiplier = Math.pow(2, roundIdx);
              
              return (
                <div key={roundName} className="relative">
                  {/* Round Header */}
                  <div className="mb-4 text-center">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {getRoundLabel(roundName)}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-semibold mt-1">
                      {sortedMatches.length} {sortedMatches.length === 1 ? 'Match' : 'Matches'}
                    </p>
                  </div>

                  {/* Matches Container */}
                  <div className="space-y-4" style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    minHeight: roundIdx === 0 ? 'auto' : `${sortedMatches.length * spacingMultiplier * 80}px`
                  }}>
                    {sortedMatches.map((match, matchIdx) => (
                      <div 
                        key={match.id}
                        style={{
                          marginTop: matchIdx > 0 && roundIdx > 0 ? `${spacingMultiplier * 40}px` : '0'
                        }}
                      >
                        {renderMatch(match, roundIdx, matchIdx, sortedMatches.length)}
                      </div>
                    ))}
                  </div>

                  {/* Vertical Connectors (SVG) */}
                  {!isLastRound && sortedMatches.length > 1 && (
                    <svg 
                      className="absolute left-full top-0 pointer-events-none"
                      style={{ 
                        width: '48px', 
                        height: '100%',
                        transform: 'translateY(56px)'
                      }}
                    >
                      {sortedMatches.map((match, idx) => {
                        if (idx % 2 === 1) return null;
                        
                        const matchHeight = 80 + (spacingMultiplier * 40);
                        const y1 = (idx * matchHeight) + (matchHeight / 2);
                        const y2 = ((idx + 1) * matchHeight) + (matchHeight / 2);
                        const midY = (y1 + y2) / 2;
                        
                        return (
                          <g key={idx}>
                            <line
                              x1="0"
                              y1={y1}
                              x2="24"
                              y2={y1}
                              stroke="#374151"
                              strokeWidth="2"
                            />
                            <line
                              x1="0"
                              y1={y2}
                              x2="24"
                              y2={y2}
                              stroke="#374151"
                              strokeWidth="2"
                            />
                            <line
                              x1="24"
                              y1={y1}
                              x2="24"
                              y2={y2}
                              stroke="#374151"
                              strokeWidth="2"
                            />
                            <line
                              x1="24"
                              y1={midY}
                              x2="48"
                              y2={midY}
                              stroke="#374151"
                              strokeWidth="2"
                            />
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              );
            })}

            {/* Champion Trophy */}
            {champion && (
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3 animate-pulse" />
                  <div className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-lg p-4 border-2 border-yellow-500 shadow-2xl min-w-[160px]">
                    <Avatar className="w-16 h-16 mx-auto border-4 border-white shadow-xl mb-2">
                      <AvatarImage src={champion.logo_url} />
                      <AvatarFallback className="bg-yellow-500 text-white text-xl font-black">
                        {champion.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-sm font-black text-white uppercase mb-1">
                      {champion.name}
                    </h3>
                    <Badge className="bg-white text-yellow-700 font-black text-xs">
                      CHAMPION
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}