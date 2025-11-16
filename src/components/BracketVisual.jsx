import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, Loader2, GripVertical } from "lucide-react";

export default function BracketVisual({ tournament, matches, teams, onMatchClick }) {
  const getTeam = (teamId) => teams.find(t => t.id === teamId);

  const renderTeamSlot = (teamId, isWinner, wins, showGrip = false) => {
    const team = getTeam(teamId);
    
    if (!team) {
      return (
        <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 min-h-[60px]">
          <div className="w-2 h-8 bg-gray-400 rounded"></div>
          <div className="flex-1">
            <span className="text-sm text-gray-400 font-medium">TBD</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 p-3 rounded transition-all min-h-[60px] ${
        isWinner 
          ? 'bg-white dark:bg-gray-800 border-2 border-green-500 dark:border-green-600 shadow-md' 
          : 'bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700'
      }`}>
        <div className="w-2 h-8 bg-gray-900 dark:bg-white rounded"></div>
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
    );
  };

  const renderMatchBox = (match) => {
    const homeTeam = getTeam(match.home_team_id);
    const awayTeam = getTeam(match.away_team_id);
    const isCompleted = match.status === 'completed';
    const homeWins = isCompleted && match.winner_team_id === match.home_team_id;
    const awayWins = isCompleted && match.winner_team_id === match.away_team_id;

    return (
      <div 
        className="relative cursor-pointer group"
        onClick={() => onMatchClick(match)}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-2 space-y-1 hover:shadow-lg transition-all min-w-[200px]">
          {renderTeamSlot(match.home_team_id, homeWins)}
          {renderTeamSlot(match.away_team_id, awayWins)}
        </div>
        {/* Winner indicator box on the right */}
        {isCompleted && (
          <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-10 h-16 bg-white dark:bg-gray-800 border-2 border-green-500 dark:border-green-600 rounded flex items-center justify-center shadow-md">
            <span className="text-xs font-black text-gray-900 dark:text-white">
              {homeWins ? homeTeam?.name?.substring(0, 2).toUpperCase() : awayTeam?.name?.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderBracketRound = (roundName, roundMatches, isFirstRound, isLastRound) => {
    const sortedMatches = [...roundMatches].sort((a, b) => a.match_number - b.match_number);
    
    return (
      <div className="flex flex-col justify-around min-h-full space-y-8">
        {sortedMatches.map((match, idx) => (
          <div key={match.id} className="relative">
            {renderMatchBox(match)}
            
            {/* Connector lines to next round */}
            {!isLastRound && (
              <>
                {/* Horizontal line from match */}
                <div className="absolute left-full top-1/2 w-8 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                
                {/* Vertical connector for pairs */}
                {idx % 2 === 0 && idx < sortedMatches.length - 1 && (
                  <div className="absolute left-full top-1/2 w-8 border-t-2 border-gray-300 dark:border-gray-600">
                    <div className={`absolute left-full top-0 border-l-2 border-gray-300 dark:border-gray-600 ${
                      idx === 0 ? 'h-32' : 'h-48'
                    }`}></div>
                  </div>
                )}
              </>
            )}
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

      {/* Bracket Layout */}
      <div className="relative">
        <div className="flex gap-16 overflow-x-auto pb-8">
          {roundOrder.map((roundName, roundIdx) => {
            const roundMatches = matchesByRound[roundName] || [];
            if (roundMatches.length === 0) return null;
            
            const isFirstRound = roundIdx === 0;
            const isLastRound = roundName === 'finals';
            
            return (
              <div key={roundName} className="flex-shrink-0">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">
                    {roundName.replace(/_/g, ' ')}
                  </h3>
                </div>
                {renderBracketRound(roundName, roundMatches, isFirstRound, isLastRound)}
              </div>
            );
          })}

          {/* Champion Display */}
          {champion && (
            <div className="flex-shrink-0 flex items-center">
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
  );
}