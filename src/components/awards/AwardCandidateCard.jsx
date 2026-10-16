import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star } from "lucide-react";

/**
 * Single award candidate row. Displays identity, team, division, and the
 * stat line relevant to the active award. `highlight` marks a suggested
 * Mythical selection (top N by score).
 */
export default function AwardCandidateCard({ candidate, award, rank, highlight, sport }) {
  const stats = award === 'finals_mvp' ? candidate.finals_stats : candidate.season_stats;
  const score = award === 'finals_mvp' ? candidate.finals_score : candidate.season_score;
  const isVolleyball = candidate.sport === 'volleyball';

  if (!stats && award === 'finals_mvp') {
    return null; // no finals stats — not a finals candidate
  }

  const gp = stats?.gamesPlayed || 0;

  const statCells = isVolleyball
    ? [
        { label: 'GP', value: gp },
        { label: 'PTS', value: stats?.points || 0 },
        { label: 'ACES', value: stats?.aces || 0 },
        { label: 'ATT', value: stats?.attacks || 0 },
        { label: 'BLK', value: stats?.blocks || 0 },
      ]
    : [
        { label: 'GP', value: gp },
        { label: 'PTS', value: stats?.points || 0 },
        { label: 'REB', value: stats?.rebounds || 0 },
        { label: 'AST', value: stats?.assists || 0 },
        { label: 'STL', value: stats?.steals || 0 },
        { label: 'BLK', value: stats?.blocks || 0 },
        { label: '3PT', value: stats?.three_pointers || 0 },
      ];

  return (
    <div
      className={`group relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border bg-card p-4 transition-colors ${
        highlight
          ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
          : 'border-border hover:bg-muted/40'
      }`}
    >
      {/* Rank */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className={`w-10 h-10 flex items-center justify-center font-heading font-bold text-sm border ${
            highlight
              ? 'bg-primary text-primary-foreground border-primary'
              : rank === 1
              ? 'bg-muted text-foreground border-border'
              : 'bg-background text-muted-foreground border-border'
          }`}
        >
          {rank <= 3 && award !== 'mythical' ? <Trophy className="w-4 h-4" /> : rank}
        </div>
        {highlight && (
          <Star className="w-4 h-4 text-primary fill-primary/20 shrink-0 sm:hidden" />
        )}
      </div>

      {/* Identity */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="w-11 h-11 border border-border shrink-0">
          <AvatarImage src={candidate.photo_url} />
          <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
            {candidate.jersey_number || candidate.player_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-heading font-bold text-foreground truncate">
              {candidate.player_name}
            </p>
            {highlight && (
              <Star className="w-4 h-4 text-primary fill-primary/20 shrink-0 hidden sm:block" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {candidate.team_name}
            {candidate.jersey_number ? ` · #${candidate.jersey_number}` : ''}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-medium uppercase">
              {candidate.division}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stat line */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto sm:justify-end">
        {statCells.map((c) => (
          <div key={c.label} className="text-center px-2 sm:px-3 border-l border-border first:border-l-0">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{c.label}</div>
            <div className="text-sm font-bold text-foreground tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Score */}
      <div className="shrink-0 sm:ml-2">
        <div className="text-right">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Score</div>
          <div className={`text-xl font-heading font-bold tabular-nums ${highlight ? 'text-primary' : 'text-foreground'}`}>
            {score}
          </div>
        </div>
      </div>
    </div>
  );
}