import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Eye, EyeOff } from "lucide-react";

/**
 * One basketball player row in live scoring.
 * Layout stacks the player name above the stat strip on small screens so the
 * full name is always readable, and returns to a single line from sm upward.
 */
export default function BasketballPlayerRow({
  player,
  team,
  teamId,
  onSelect,
  game,
  selectedPlayer,
  userRole,
  getPlayerStat,
  getTotalPlayerFouls,
  onSubstitute,
  statsHidden,
  onToggleStats,
}) {
  const totalFouls = getTotalPlayerFouls(player.id);
  const points = getPlayerStat(player.id, 'points');
  const rebounds = getPlayerStat(player.id, 'rebounds');
  const assists = getPlayerStat(player.id, 'assists');
  const steals = getPlayerStat(player.id, 'steals');
  const blocks = getPlayerStat(player.id, 'blocks');
  const plusMinus = getPlayerStat(player.id, 'plus_minus');
  const isFouledOut = totalFouls >= game.player_foul_limit;
  const isSelected = selectedPlayer?.id === player.id;

  // Active lineup restriction: only on-court players can be selected for stats.
  // Bench players remain visible but read-only until substituted in.
  const activeLineup = game?.active_lineup?.[team] || [];
  const hasLineup = activeLineup.length > 0;
  const isActive = !hasLineup || activeLineup.includes(player.id);

  // Determine if player can be selected based on role
  const isHomePlayer = teamId === game.home_team_id;
  const canSelectPlayer = game.sport !== 'basketball' ||
    userRole === 'overall' ||
    (userRole === 'home_stat' && isHomePlayer) ||
    (userRole === 'away_stat' && !isHomePlayer);
  const isDisabledByRole = !canSelectPlayer;
  const isBench = hasLineup && !isActive;
  const isDisabled = isFouledOut || isDisabledByRole || isBench;

  // Stat cells hidden at tablet/mobile widths only when the scorekeeper collapses
  // this player's strip. Desktop (lg+) always shows the full strip.
  const statCellClass = `text-center ${statsHidden ? 'hidden lg:block' : ''}`;

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled || undefined}
      onClick={() => {
        if (isDisabled) return;
        onSelect(player, team);
      }}
      onKeyDown={(e) => {
        if (isDisabled || e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(player, team);
        }
      }}
      className={`w-full text-left border rounded-sm p-3 mb-2 transition-colors ${
        isDisabled
          ? isBench
            ? 'bg-muted/30 opacity-60 cursor-not-allowed border-dashed border-border'
            : 'bg-muted opacity-50 cursor-not-allowed border-border'
          : isSelected
            ? 'bg-primary border-primary text-primary-foreground'
            : isActive
              ? 'bg-card border-primary/40 hover:border-primary hover:bg-primary/5'
              : 'bg-card border-border hover:border-foreground/30'
      }`}
      title={isBench ? 'On bench — substitute in to record stats' : undefined}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className={`w-10 h-10 shrink-0 border ${isActive && !isDisabled ? 'border-primary/50' : 'border-border'} ${isBench ? 'grayscale opacity-70' : ''}`}>
            <AvatarImage src={player.photo_url} />
            <AvatarFallback className={`text-sm font-heading font-bold ${isSelected ? 'bg-background text-foreground' : 'bg-secondary text-foreground'}`}>
              {player.jersey_number}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-heading font-bold leading-snug break-words ${isSelected ? 'text-primary-foreground' : isBench ? 'text-muted-foreground' : 'text-foreground'}`}>
              {player.first_name} {player.last_name}
            </p>
            {isBench && (
              <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-wider">Bench</span>
            )}
            {isActive && !isSelected && !isFouledOut && (
              <span className="text-[10px] font-heading font-bold text-primary uppercase tracking-wider">On Court</span>
            )}
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-2 lg:w-auto lg:justify-end lg:gap-3 lg:flex-shrink-0">
          <div className={`flex flex-1 justify-between gap-2 lg:flex-none lg:justify-start lg:gap-3 ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
            <div className={statCellClass}>
              <div className="text-xl font-heading font-bold tabular-nums">{points}</div>
              <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>PTS</div>
            </div>
            <div className={statCellClass}>
              <div className="text-xl font-heading font-bold tabular-nums">{rebounds}</div>
              <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>REB</div>
            </div>
            <div className={statCellClass}>
              <div className="text-xl font-heading font-bold tabular-nums">{assists}</div>
              <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>AST</div>
            </div>
            <div className={statCellClass}>
              <div className="text-xl font-heading font-bold tabular-nums">{steals}</div>
              <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>STL</div>
            </div>
            <div className={statCellClass}>
              <div className="text-xl font-heading font-bold tabular-nums">{blocks}</div>
              <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>BLK</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-heading font-bold tabular-nums ${totalFouls >= game.player_foul_limit - 1 ? 'text-destructive' : ''}`}>{totalFouls}</div>
              <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>FL</div>
            </div>
            <div className={statCellClass}>
              <div className={`text-xl font-heading font-bold tabular-nums ${plusMinus > 0 ? 'text-primary' : plusMinus < 0 ? 'text-destructive' : ''}`}>{plusMinus > 0 ? `+${plusMinus}` : plusMinus}</div>
              <div className={`text-[9px] font-medium ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>+/-</div>
            </div>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStats?.(player.id);
            }}
            variant="outline"
            size="sm"
            className={`lg:hidden h-7 px-2 text-[10px] font-heading font-bold border-border flex-shrink-0 ${
              isSelected ? 'border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10' : 'text-foreground hover:bg-muted'
            }`}
            aria-label={statsHidden ? 'Show stats' : 'Hide stats'}
            aria-expanded={!statsHidden}
            title={statsHidden ? 'Show stats' : 'Hide stats'}
          >
            {statsHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
          {isFouledOut && (
            <Badge className="bg-destructive text-destructive-foreground text-[10px] font-heading font-bold px-1.5 py-0.5">FOULED OUT</Badge>
          )}
          {isActive && !isDisabled && !isFouledOut && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onSubstitute(player, team);
              }}
              variant="outline"
              size="sm"
              className={`h-7 px-2 text-[10px] font-heading font-bold border-border flex-shrink-0 ${
                isSelected ? 'border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10' : 'text-foreground hover:bg-muted'
              }`}
              title="Substitute out"
            >
              <ArrowLeftRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}