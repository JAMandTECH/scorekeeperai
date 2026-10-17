import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function LeaderCard({ title, icon: Icon, organization, division = null, data = [], emptyText = "No data available." }) {
  return (
    <Card className="border border-border bg-card print:shadow-none print:break-inside-avoid">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl font-heading font-bold print:text-lg flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-primary" />}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {division && (
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline truncate max-w-[160px]">{division}</span>
            )}
            {organization?.logo_url && (
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src={organization.logo_url} />
                <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-[10px]">
                  {(organization.name || "").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 print:p-4">
        <div className="space-y-2">
          {data.length === 0 && (
            <div className="text-sm text-muted-foreground">{emptyText}</div>
          )}
          {data.map((player, i) => (
            <div
              key={player.id || player.player_id || i}
              className="flex items-center gap-3 border border-border bg-background p-3 print:p-2"
            >
              <div
                className={`w-8 h-8 flex items-center justify-center text-sm font-heading font-bold border border-border ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : i === 1
                    ? "bg-muted text-foreground"
                    : i === 2
                    ? "bg-muted text-foreground"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-bold text-foreground truncate print:text-xs">
                  {player.first_name} {player.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {player.teamName}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-heading font-bold text-foreground tabular-nums print:text-lg leading-none">
                  {player.average}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  {player.averageLabel} · {player.total} total
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}