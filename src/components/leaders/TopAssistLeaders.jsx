import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import LeaderCard from "@/components/leaders/LeaderCard";
import { Users } from "lucide-react";

export default function TopAssistLeaders({ organizationId = null, sport = "basketball", limit = 10, title = "Top 10 Assist Leaders", orgName = null, orgLogoUrl = null, division = null }) {
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
    id: p.player_id,
    first_name: p.first_name,
    last_name: p.last_name,
    jersey_number: p.jersey_number,
    photo_url: p.photo_url,
    teamName: p.team_name,
    teamLogoUrl: p.team_logo_url,
    total: p.total_assists,
    average: p.apg,
    averageLabel: "APG",
  }));

  return (
    <LeaderCard
      title={title}
      icon={Users}
      iconGradient="from-purple-500 to-purple-600"
      organization={{ name: orgName, logo_url: orgLogoUrl }}
      data={leaders}
      emptyText={isLoading ? "Loading..." : isError ? "Failed to load leaders." : "No data available."}
    />
  );
}