import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function TopAssistLeaders({ organizationId = null, sport = "basketball", limit = 10, title = "Top 10 Assist Leaders", orgName = null, orgLogoUrl = null }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["top-assist-leaders", organizationId, sport, limit],
    queryFn: async () => {
      const res = await base44.functions.invoke("getTopAssistLeaders", {
        organization_id: organizationId,
        sport,
        limit,
      });
      return res.data?.leaders || [];
    },
  });

  return (
    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-black">A</span>
            </div>
            <CardTitle className="text-xl font-black text-gray-900 dark:text-white">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {orgName && <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{orgName}</span>}
            {orgLogoUrl && (
              <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                <AvatarImage src={orgLogoUrl} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-xs">
                  {(orgName || '').substring(0,2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : isError ? (
          <div className="text-sm text-red-600 dark:text-red-400">Failed to load leaders.</div>
        ) : leaders.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No data available.</div>
        ) : (
          <div className="space-y-2">
            {leaders.map((p, i) => (
              <div key={p.player_id} className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-md ${
                    i === 0
                      ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900"
                      : i === 1
                      ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white"
                      : i === 2
                      ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white"
                      : "bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {i + 1}
                </div>
                <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                  <AvatarImage src={p.photo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-purple-700 text-white text-xs font-bold">
                    {p.jersey_number}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{p.jersey_number} {p.first_name} {p.last_name}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-5 h-5 border border-gray-200 dark:border-gray-700">
                      <AvatarImage src={p.team_logo_url} />
                      <AvatarFallback className="bg-gray-200 text-[10px] font-bold">{p.team_name?.substring(0,2)?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{p.team_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{p.total_assists}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{p.apg} APG</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}