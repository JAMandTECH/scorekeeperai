import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TopAssistLeaders({
  organizationId = null,
  sport = "basketball",
  limit = 10,
  title = "Top Assist Leaders",
  orgName = null,
  orgLogoUrl = null,
  division = null,
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["top-assist-leaders", organizationId, sport, division, limit],
    queryFn: async () => {
      const res = await base44.functions.invoke("getTopAssistLeaders", {
        organization_id: organizationId,
        sport,
        division,
        limit,
      });
      const leaders = res?.data?.leaders;
      return Array.isArray(leaders) ? leaders : [];
    },
    initialData: [],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const leaders = (Array.isArray(data) ? data : []).map((p) => ({
    name:
      `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
      `Player ${String(p.player_id || "").slice(-4)}`,
    team: p.team_name || "Unknown",
    avg: p.apg != null ? Number(p.apg).toFixed(1) : "0.0",
    value: p.total_assists || 0,
  }));

  return (
    <Card className="border border-border bg-card print:shadow-none print:break-inside-avoid">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-xl font-heading font-bold print:text-lg">
          🏀 {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 print:p-4">
        <div className="space-y-2">
          {leaders.length === 0 && (
            <div className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading..."
                : isError
                ? "Failed to load leaders."
                : "No data available."}
            </div>
          )}
          {leaders.map((player, index) => (
            <div
              key={index}
              className="flex items-center gap-3 border border-border bg-background p-3 print:p-2"
            >
              <div
                className={`w-8 h-8 flex items-center justify-center text-sm font-heading font-bold border border-border ${
                  index === 0
                    ? "bg-primary text-primary-foreground"
                    : index === 1
                    ? "bg-muted text-foreground"
                    : index === 2
                    ? "bg-muted text-foreground"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-bold text-foreground truncate print:text-xs">
                  {player.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {player.team}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-heading font-bold text-foreground tabular-nums print:text-lg leading-none">
                  {player.avg}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  APG · {player.value} total
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}