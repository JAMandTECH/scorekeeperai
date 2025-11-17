import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, GripVertical } from "lucide-react";

export default function BracketVisual({ tournament, matches, teams, onMatchClick, onTeamReorder }) {
  const getTeam = (teamId) => teams.find(t => t.id === teamId);

  const handleDragEnd = (result) => {
    if (!result.destination || !onTeamReorder) return;
    
    const { source, destination } = result;
    
    // Parse the droppableId format: "match-{matchId}-{slot}" where slot is 'home' or 'away'
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
              className={`flex items-center gap-2 p-3 rounded border-2 border-dashed min-h-[56px] transition-all ${
                snapshot.isDraggingOver 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' 
                  : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <div className="w-1.5 h-8 bg-gray-400 rounded"></div>
              <span className="text-sm text-gray-400 font-semibold">TBD</span>
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
            className={`transition-all ${
              snapshot.isDraggingOver ? 'ring-2 ring-blue-500 rounded' : ''
            }`}
          >
            <Draggable draggableId={`team-${teamId}-${matchId}-${slot}`} index={0} isDragDisabled={!isEditable}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  className={`flex items-center gap-2 p-3 rounded transition-all min-h-[56px] ${
                    snapshot.isDragging ? 'shadow-2xl scale-105 z-50' : ''
                  } ${
                    isWinner 
                      ? 'bg-white dark:bg-gray-800 border-2 border-green-500 dark:border-green-600 shadow-md' 
                      : 'bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700'
                  } ${isEditable ? 'cursor-move' : 'cursor-default'}`}
                >
                  {isEditable && (
                    <div {...provided.dragHandleProps}>
                      <GripVertical className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="w-1.5 h-8 bg-gray-900 dark:bg-white rounded"></div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="w-8 h-8 border border-gray-200 dark:border-gray-700">
                      <AvatarImage src={team.logo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">
                        {team.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate uppercase">
                      {team.name}
                    </span>
                  </div>
                  {isWinner && <Crown className="w-4 h-4 text-green-500 flex-shrink-0" />}
                </div>
              )}
            </Draggable>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  const renderMatchBox = (match, roundIndex, matchIndex, totalRounds) => {
    const isCompleted = match.status === 'completed';
    const homeWins = isCompleted && match.winner_team_id === match.home_team_id;
    const awayWins = isCompleted && match.winner_team_id === match.away_team_id;
    const isLastRound = roundIndex === totalRounds - 1;

    // Calculate vertical spacing multiplier based on round
    const spacingMultiplier = Math.pow(2, roundIndex);
    const marginTop = matchIndex > 0 ? `${spacingMultiplier * 2.5}rem` : '0';

    return (
      <div 
        className="relative"
        style={{ marginTop }}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all min-w-[220px] cursor-pointer shadow-sm hover:shadow-lg"
          onClick={() => onMatchClick(match)}
        >
          <div className="p-2 space-y-1">
            {renderTeamSlot(match, 'home', match.home_team_id, homeWins, match.id)}
            {renderTeamSlot(match, 'away', match.away_team_id, awayWins, match.id)}
          </div>
          
          {match.required_wins > 1 && (
            <div className="px-3 py-1 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                Best of {(match.required_wins * 2) - 1}
              </span>
            </div>
          )}
        </div>

        {/* Connector line to next round */}
        {!isLastRound && (
          <div className="absolute left-full top-1/2 w-10 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
        )}
      </div>
    );
  };

  const renderBracketRound = (roundName, roundMatches, roundIndex, totalRounds) => {
    const sortedMatches = [...roundMatches].sort((a, b) => a.match_number - b.match_number);
    const isLastRound = roundIndex === totalRounds - 1;
    
    return (
      <div className="flex flex-col justify-center relative" style={{ minHeight: '600px' }}>
        {/* Vertical connector lines between matches */}
        {!isLastRound && sortedMatches.length > 1 && (
          <svg className="absolute left-full top-0 w-10 h-full pointer-events-none" style={{ marginLeft: '0px' }}>
            {sortedMatches.map((match, idx) => {
              if (idx % 2 === 1) return null; // Only draw from even indices
              
              const match1Y = (idx / sortedMatches.length) * 100;
              const match2Y = ((idx + 1) / sortedMatches.length) * 100;
              const midY = (match1Y + match2Y) / 2;
              
              return (
                <g key={idx}>
                  {/* Horizontal lines from matches */}
                  <line
                    x1="0"
                    y1={`${match1Y}%`}
                    x2="50%"
                    y2={`${match1Y}%`}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-300 dark:text-gray-600"
                  />
                  <line
                    x1="0"
                    y1={`${match2Y}%`}
                    x2="50%"
                    y2={`${match2Y}%`}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-300 dark:text-gray-600"
                  />
                  {/* Vertical connector */}
                  <line
                    x1="50%"
                    y1={`${match1Y}%`}
                    x2="50%"
                    y2={`${match2Y}%`}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-300 dark:text-gray-600"
                  />
                  {/* Line to next round */}
                  <line
                    x1="50%"
                    y1={`${midY}%`}
                    x2="100%"
                    y2={`${midY}%`}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-300 dark:text-gray-600"
                  />
                </g>
              );
            })}
          </svg>
        )}
        
        {sortedMatches.map((match, idx) => (
          <div key={match.id}>
            {renderMatchBox(match, roundIndex, idx, totalRounds)}
          </div>
        ))}
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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-8 bg-white dark:bg-gray-800 rounded-xl p-8 border-2 border-gray-200 dark:border-gray-700">
        {/* Tournament Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                {tournament.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {tournament.sport.toUpperCase()} • {tournament.num_teams} Teams
              </p>
            </div>
          </div>
          <Badge className="text-lg px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black">
            TOURNAMENT BRACKET
          </Badge>
        </div>

        {/* Drag and Drop Instructions */}
        {tournament.status !== 'completed' && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-900 dark:text-blue-300 font-semibold flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              Drag and drop teams to rearrange matchups before scheduling games
            </p>
          </div>
        )}

        {/* Bracket Layout */}
        <div className="relative overflow-x-auto pb-8">
          <div className="flex gap-20 items-center" style={{ minWidth: 'max-content' }}>
            {roundOrder.map((roundName, roundIdx) => {
              const roundMatches = matchesByRound[roundName] || [];
              if (roundMatches.length === 0) return null;
              
              return (
                <div key={roundName} className="flex-shrink-0">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">
                      {roundName.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                      {roundMatches.length} {roundMatches.length === 1 ? 'Match' : 'Matches'}
                    </p>
                  </div>
                  {renderBracketRound(roundName, roundMatches, roundIdx, roundOrder.length)}
                </div>
              );
            })}

            {/* Champion Display */}
            {champion && (
              <div className="flex-shrink-0 flex items-center pl-10">
                <div className="text-center">
                  <div className="mb-4">
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto animate-pulse" />
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-xl p-6 border-4 border-yellow-500 dark:border-yellow-600 shadow-2xl min-w-[200px]">
                    <Avatar className="w-20 h-20 mx-auto border-4 border-white dark:border-gray-700 shadow-xl mb-3">
                      <AvatarImage src={champion.logo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white text-2xl font-black">
                        {champion.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase mb-1">
                      {champion.name}
                    </h3>
                    <Badge className="bg-yellow-500 text-gray-900 font-black">
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