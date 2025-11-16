import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, Loader2 } from "lucide-react";

export default function BracketVisual({ tournament, matches, teams, onMatchClick }) {
  const getTeam = (teamId) => teams.find(t => t.id === teamId);

  const renderTeamSlot = (teamId, isWinner, wins, teamSide) => {
    const team = getTeam(teamId);
    
    if (!team) {
      return (
        <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-gray-400 animate-pulse" />
          </div>
          <span className="text-sm text-gray-400 font-medium">TBD</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center justify-between gap-2 p-2 rounded-lg border-2 transition-all ${
        isWinner 
          ? 'bg-green-50 dark:bg-green-950/30 border-green-500 dark:border-green-700' 
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="w-8 h-8 border-2 border-white dark:border-gray-700 shadow-sm">
            <AvatarImage src={team.logo_url} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">
              {team.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{team.name}</span>
        </div>
        {wins !== undefined && (
          <Badge variant={isWinner ? "default" : "outline"} className={`text-xs font-black ${isWinner ? 'bg-green-600' : ''}`}>
            {wins}
          </Badge>
        )}
        {isWinner && <Crown className="w-4 h-4 text-yellow-500" />}
      </div>
    );
  };

  const renderMatch = (match) => {
    const homeTeam = getTeam(match.home_team_id);
    const awayTeam = getTeam(match.away_team_id);
    const isCompleted = match.status === 'completed';
    const canSchedule = match.status === 'ready';

    return (
      <Card 
        key={match.id} 
        className={`border-2 cursor-pointer transition-all hover:shadow-lg ${
          isCompleted ? 'border-green-300 dark:border-green-700' :
          canSchedule ? 'border-blue-300 dark:border-blue-700' :
          'border-gray-200 dark:border-gray-700'
        }`}
        onClick={() => onMatchClick(match)}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-xs font-bold">
              {match.round_name.replace(/_/g, ' ').toUpperCase()}
            </Badge>
            {match.required_wins > 1 && (
              <Badge className="text-xs bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                Best of {(match.required_wins * 2) - 1}
              </Badge>
            )}
          </div>
          {renderTeamSlot(match.home_team_id, match.winner_team_id === match.home_team_id, match.home_team_wins, 'home')}
          <div className="text-center text-xs text-gray-400 font-bold">VS</div>
          {renderTeamSlot(match.away_team_id, match.winner_team_id === match.away_team_id, match.away_team_wins, 'away')}
          {isCompleted && (
            <div className="text-center">
              <Badge className="bg-green-600 text-white text-xs font-bold">
                COMPLETED
              </Badge>
            </div>
          )}
          {canSchedule && !match.game_ids?.length && (
            <div className="text-center">
              <Badge className="bg-blue-600 text-white text-xs font-bold">
                READY TO SCHEDULE
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-3 mb-6">
        <Trophy className="w-8 h-8 text-yellow-500" />
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">
          {tournament.name}
        </h2>
        <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold">
          {tournament.sport.toUpperCase()}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
        {roundOrder.map((roundName) => {
          const roundMatches = matchesByRound[roundName] || [];
          if (roundMatches.length === 0) return null;
          
          return (
            <div key={roundName} className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-black text-gray-900 dark:text-white capitalize">
                  {roundName.replace(/_/g, ' ')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  {roundMatches.length} {roundMatches.length === 1 ? 'Match' : 'Matches'}
                </p>
              </div>
              <div className="space-y-4">
                {roundMatches
                  .sort((a, b) => a.match_number - b.match_number)
                  .map(match => renderMatch(match))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}