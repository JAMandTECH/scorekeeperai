import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function LeaderCard({ title, icon: Icon, organization, data = [], emptyText = "No data available." }) {
  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 border border-border bg-secondary flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="font-heading text-base sm:text-lg font-bold tracking-tight truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {organization?.name && (
            <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[180px]">{organization.name}</span>
          )}
          {organization?.logo_url && (
            <Avatar className="w-9 h-9 border border-border">
              <AvatarImage src={organization.logo_url} className="grayscale" />
              <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-xs">
                {(organization.name || "").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      <div className="p-2.5 sm:p-3 space-y-1">
        {data.length === 0 && (
          <div className="text-sm text-muted-foreground px-2 py-6 text-center">{emptyText}</div>
        )}
        {data.map((player, i) => (
          <div
            key={player.id || player.player_id || i}
            className="flex items-center gap-3 px-2.5 sm:px-3 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0"
          >
            <div className={`w-7 text-center font-heading text-sm font-bold tabular-nums shrink-0 ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              {i + 1}
            </div>

            <Avatar className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 border border-border bg-secondary">
              <AvatarImage src={player.photo_url} className="object-cover" />
              <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                {player.jersey_number}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {player.first_name} {player.last_name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {player.teamLogoUrl && (
                  <img src={player.teamLogoUrl} alt="" className="w-4 h-4 object-cover grayscale" />
                )}
                <p className="text-xs text-muted-foreground truncate">{player.teamName}</p>
              </div>
            </div>

            <div className="text-right shrink-0 pl-1">
              <p className="font-heading text-xl sm:text-2xl font-bold text-primary tabular-nums leading-none">{player.average}</p>
              <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                {player.averageLabel} · {player.total} total
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}