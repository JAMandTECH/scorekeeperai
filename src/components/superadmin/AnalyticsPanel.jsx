import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Globe, FileText, Layers, Loader2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
];

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-heading font-bold text-muted-foreground">
          <Icon className="w-4 h-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-heading font-bold tabular-nums truncate">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-1/3 bg-muted animate-pulse" />
      <div className="h-4 w-2/3 bg-muted animate-pulse" />
      <div className="h-4 w-1/2 bg-muted animate-pulse" />
    </div>
  );
}

export default function AnalyticsPanel() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics-data', days],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAnalyticsData', { days });
      if (response?.data?.error) throw new Error(response.data.error);
      return response.data;
    },
  });

  const topPage = data?.topPages?.[0];
  const topCountry = data?.countryBreakdown?.[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-xl font-heading font-bold">
            <Activity className="w-5 h-5 text-primary" />
            Site Analytics
          </CardTitle>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Button
                key={r.days}
                size="sm"
                variant={days === r.days ? 'default' : 'outline'}
                onClick={() => setDays(r.days)}
                className="font-medium"
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Traffic from the last {days} days. Analytics data is retained for 60 days.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6"><Skeleton /></CardContent>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-3 p-4 border border-destructive/30 bg-destructive/5">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Couldn't load analytics.</p>
              <p className="text-muted-foreground mt-1">{error?.message || 'Unknown error'}</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile icon={Activity} label="Total Events" value={data.totals.totalEvents.toLocaleString()} sub={`${data.totals.eventTypes} event types`} />
              <StatTile icon={FileText} label="Top Page" value={topPage?.page || '—'} sub={topPage ? `${topPage.count.toLocaleString()} views` : 'No page views'} />
              <StatTile icon={Globe} label="Top Country" value={topCountry?.country || '—'} sub={topCountry ? `${topCountry.count.toLocaleString()} views` : 'No data'} />
              <StatTile icon={Layers} label="Event Types" value={data.totals.eventTypes} sub="Tracked event names" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-heading font-bold text-base mb-3">Most Visited Pages</h3>
                {data.topPages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No page views recorded in this period.</p>
                ) : (
                  <div className="border border-border">
                    {data.topPages.map((p, i) => (
                      <div key={p.page + i} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0">
                        <span className="text-sm font-medium truncate pr-3">{p.page}</span>
                        <span className="text-sm tabular-nums text-muted-foreground shrink-0">{p.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-heading font-bold text-base mb-3">Top Countries</h3>
                {data.countryBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No country data recorded in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.countryBreakdown} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="country" width={90} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Views" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-heading font-bold text-base mb-3">Tracked Events</h3>
              {data.eventNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">No custom events tracked yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.eventNames.map((e) => (
                    <div key={e.name} className="flex items-center gap-2 border border-border px-3 py-1.5">
                      <span className="text-sm font-medium">{e.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{e.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}