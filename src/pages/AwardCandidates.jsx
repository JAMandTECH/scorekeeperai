import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Award, Trophy, Star, Loader2, Filter, Crown, Users } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import AwardCandidateCard from "@/components/awards/AwardCandidateCard";
import AwardReportExport from "@/components/awards/AwardReportExport";
import { createPageUrl } from "@/utils";

const AWARD_CONFIG = {
  season_mvp: {
    label: 'Season MVP',
    icon: Trophy,
    description: 'All players ranked by composite season score across every completed game.',
    mythical: false,
  },
  finals_mvp: {
    label: 'Finals MVP',
    icon: Crown,
    description: 'Players from finals games only, ranked by composite finals score.',
    mythical: false,
  },
  mythical: {
    label: 'Mythical Team',
    icon: Star,
    description: 'Full candidate pool. The suggested lineup is the top 5 (basketball) or top 6 (volleyball) by score.',
    mythical: true,
  },
};

export default function AwardCandidates() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [award, setAward] = useState('season_mvp');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedSport, setSelectedSport] = useState('basketball');
  const [superAdminOrgId, setSuperAdminOrgId] = useState(
    () => localStorage.getItem('superAdminAwardsOrgId') || null
  );

  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) document.documentElement.classList.add('dark');
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      try {
        const res = await base44.functions.invoke('getUserOrganization', {});
        setOrganization(res?.data?.organization || null);
      } catch {
        setOrganization(null);
      }
    } catch {
      base44.auth.redirectToLogin(createPageUrl("AwardCandidates"));
    }
  };

  const handleLogout = () => base44.auth.logout(createPageUrl("PublicLanding"));

  const orgId = user?.organization_id || user?.active_organization_id || (isSuperAdmin ? superAdminOrgId : null);

  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['all-organizations-awards'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getAllOrganizations', {});
      return res?.data?.organizations || [];
    },
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (isSuperAdmin && superAdminOrgId) {
      const org = allOrganizations.find((o) => o.id === superAdminOrgId);
      if (org) setOrganization(org);
    }
  }, [isSuperAdmin, superAdminOrgId, allOrganizations]);

  const handleSuperAdminOrgChange = (id) => {
    setSuperAdminOrgId(id);
    localStorage.setItem('superAdminAwardsOrgId', id);
  };

  const effectiveOrgId = isSuperAdmin ? superAdminOrgId : orgId;

  const { data, isFetching } = useQuery({
    queryKey: ['awardCandidates', effectiveOrgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getAwardCandidates', {
        organization_id: effectiveOrgId,
      });
      return res?.data || null;
    },
    enabled: !!effectiveOrgId && isAdmin,
    staleTime: 30000,
  });

  const candidates = data?.candidates || [];
  const divisions = data?.divisions || [];
  const sports = data?.sports || [];

  // Default sport to basketball if available, else first sport
  useEffect(() => {
    if (sports.length > 0 && !sports.includes(selectedSport)) {
      setSelectedSport(sports.includes('basketball') ? 'basketball' : sports[0]);
    }
  }, [sports, selectedSport]);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (selectedSport !== 'all' && c.sport !== selectedSport) return false;
      if (selectedDivision !== 'all' && c.division !== selectedDivision) return false;
      if (award === 'finals_mvp' && !c.finals_stats) return false;
      return true;
    });
  }, [candidates, selectedSport, selectedDivision, award]);

  // Sort by the relevant score, then cap the shortlist per award type
  const AWARD_LIMITS = { season_mvp: 10, finals_mvp: 10, mythical: 20 };
  const sorted = useMemo(() => {
    const scoreKey = award === 'finals_mvp' ? 'finals_score' : 'season_score';
    return [...filtered]
      .sort((a, b) => (b[scoreKey] || 0) - (a[scoreKey] || 0))
      .slice(0, AWARD_LIMITS[award]);
  }, [filtered, award]);

  // Full candidate list for the report: respect the current sport/division
  // filter but do NOT cap at the on-screen top-10/20 shortlist.
  const reportCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (selectedSport !== 'all' && c.sport !== selectedSport) return false;
      if (selectedDivision !== 'all' && c.division !== selectedDivision) return false;
      return true;
    });
  }, [candidates, selectedSport, selectedDivision]);

  // Mythical lineup size: basketball 5, volleyball 6
  const mythicalSize = selectedSport === 'volleyball' ? 6 : 5;
  const mythicalLineupIds = useMemo(() => {
    if (award !== 'mythical') return new Set();
    return new Set(sorted.slice(0, mythicalSize).map((c) => c.player_id));
  }, [sorted, award, mythicalSize]);

  const config = AWARD_CONFIG[award];
  const Icon = config.icon;

  const divisionOptions = ['all', ...divisions];
  const sportOptions = ['all', ...sports];

  if (user && !isAdmin) {
    return (
      <div className="arena-command min-h-screen bg-background text-foreground">
        <AdminHeader user={user} organization={organization} darkMode={darkMode} handleLogout={handleLogout}
          sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="p-6 lg:p-8 max-w-3xl mx-auto text-center border border-border p-10 mt-10">
          <h1 className="font-heading text-2xl font-bold mb-2">Admins only</h1>
          <p className="text-muted-foreground mb-6 text-sm">Award candidates are only available to organization administrators.</p>
          <Button onClick={() => (window.location.href = createPageUrl("Home"))}>Go to Home</Button>
        </div>
      </div>
    );
  }

  if (user && isSuperAdmin && !effectiveOrgId) {
    return (
      <div className="arena-command min-h-screen bg-background text-foreground">
        <AdminHeader user={user} organization={organization} darkMode={darkMode} handleLogout={handleLogout}
          sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="p-6 lg:p-8 max-w-3xl mx-auto text-center border border-border p-10 mt-10 space-y-4">
          <h1 className="font-heading text-2xl font-bold mb-2">Select an organization</h1>
          <p className="text-muted-foreground mb-2 text-sm">Pick an organization to view its award candidates.</p>
          <select
            value={superAdminOrgId || ''}
            onChange={(e) => handleSuperAdminOrgChange(e.target.value)}
            className="bg-background border border-border text-foreground px-4 py-2 font-medium max-w-xs"
          >
            <option value="" disabled>Choose an organization…</option>
            {allOrganizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="arena-command min-h-screen bg-background text-foreground">
      <AdminHeader user={user} organization={organization} darkMode={darkMode} handleLogout={handleLogout}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <AdminSidebar user={user} organization={organization} sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen} handleLogout={handleLogout} />
        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Award className="w-8 h-8 text-primary" />
                    Award Candidates
                  </h1>
                  <p className="text-muted-foreground mt-2 font-medium text-sm">
                    {organization?.name || 'Organization'} · {config.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <AwardReportExport candidates={reportCandidates} organization={organization} disabled={isFetching} />
                  {isSuperAdmin && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-wide">Org:</span>
                      <select
                        value={superAdminOrgId || ''}
                        onChange={(e) => handleSuperAdminOrgChange(e.target.value)}
                        className="bg-background border border-border text-foreground px-4 py-2 font-medium"
                      >
                        <option value="" disabled>Select…</option>
                        {allOrganizations.map((org) => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Award tabs */}
              <Tabs value={award} onValueChange={setAward}>
                <TabsList className="border border-border bg-card p-1">
                  <TabsTrigger value="season_mvp" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    <Trophy className="w-4 h-4 mr-2" /> Season MVP
                  </TabsTrigger>
                  <TabsTrigger value="finals_mvp" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    <Crown className="w-4 h-4 mr-2" /> Finals MVP
                  </TabsTrigger>
                  <TabsTrigger value="mythical" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    <Star className="w-4 h-4 mr-2" /> Mythical {selectedSport === 'volleyball' ? '6' : '5'}
                  </TabsTrigger>
                </TabsList>

                {/* Filters */}
                <Card className="border border-border bg-card mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <select
                        value={selectedSport}
                        onChange={(e) => setSelectedSport(e.target.value)}
                        className="bg-background border border-border text-foreground px-3 py-1.5 text-sm font-medium"
                      >
                        {sportOptions.map((s) => (
                          <option key={s} value={s}>
                            {s === 'all' ? 'All Sports' : s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedDivision}
                        onChange={(e) => setSelectedDivision(e.target.value)}
                        className="bg-background border border-border text-foreground px-3 py-1.5 text-sm font-medium"
                      >
                        {divisionOptions.map((d) => (
                          <option key={d} value={d}>
                            {d === 'all' ? 'All Divisions' : d}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {sorted.length} candidate{sorted.length !== 1 ? 's' : ''}
                        {award === 'mythical' && ` · ${mythicalSize}-player lineup`}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {isFetching && (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!isFetching && sorted.length === 0 && (
                  <Card className="border border-border bg-card mt-4">
                    <CardContent className="py-16 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">
                        {award === 'finals_mvp'
                          ? 'No finals games found for the selected filters.'
                          : 'No candidates found for the selected filters.'}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Mythical suggested lineup banner */}
                {award === 'mythical' && sorted.length > 0 && (
                  <Card className="border-primary/40 bg-primary/5 mt-4">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-primary fill-primary/20" />
                        <span className="font-heading font-bold text-foreground">
                          Suggested {mythicalSize}-player {selectedSport === 'volleyball' ? 'Mythical 6' : 'Mythical 5'} lineup
                        </span>
                        <span className="text-muted-foreground">— top {mythicalSize} by composite score (highlighted below).</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Candidate list */}
                {!isFetching && sorted.length > 0 && (
                  <TabsContent value={award} className="mt-4 space-y-2">
                    {sorted.map((c, i) => (
                      <AwardCandidateCard
                        key={c.player_id}
                        candidate={c}
                        award={award}
                        rank={i + 1}
                        highlight={award === 'mythical' && mythicalLineupIds.has(c.player_id)}
                        sport={selectedSport}
                      />
                    ))}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}