import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Sparkles, Loader2, FileText, AlertCircle, Calendar } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import ReportOrgSummary from "@/components/season-report/ReportOrgSummary";
import ReportDivisionSection from "@/components/season-report/ReportDivisionSection";
import DivisionChampionSelector from "@/components/season-report/DivisionChampionSelector";
import { createPageUrl } from "@/utils";

export default function SeasonReport() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [divisions, setDivisions] = useState([]);
  const [champions, setChampions] = useState({});
  const [loadingDivisions, setLoadingDivisions] = useState(false);

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
        const org = res?.data?.organization || null;
        setOrganization(org);
        const orgId = org?.id;
        if (orgId) await loadSeasons(orgId, org);
      } catch { setOrganization(null); }
    } catch {
      base44.auth.redirectToLogin(createPageUrl("SeasonReport"));
    }
  };

  const loadDivisions = async (orgId, seasonId) => {
    if (!orgId || !seasonId) return;
    setLoadingDivisions(true);
    setDivisions([]);
    setChampions({});
    try {
      let teams = [];
      if (seasonId === 'current') {
        const res = await base44.entities.Team.filter({ organization_id: orgId }, { limit: 2000 });
        teams = res?.items || res || [];
      } else {
        const res = await base44.entities.ArchivedTeam.filter(
          { organization_id: orgId, season_id: seasonId },
          { limit: 2000 }
        );
        teams = (res?.items || res || []).map((t) => ({ ...t, id: t.original_id || t.id }));
      }

      const divMap = new Map();
      for (const team of teams) {
        const div = team.division || 'Default Division';
        if (!divMap.has(div)) {
          divMap.set(div, { name: div, sport: team.sport || 'basketball', teams: [] });
        }
        divMap.get(div).teams.push({ id: team.id, name: team.name });
      }

      const autoChampions = {};
      for (const [, divData] of divMap) {
        if (divData.teams.length === 1) {
          autoChampions[divData.name] = divData.teams[0].id;
        }
      }

      setDivisions(Array.from(divMap.values()));
      setChampions(autoChampions);
    } catch (err) {
      console.error('Failed to load divisions:', err);
    } finally {
      setLoadingDivisions(false);
    }
  };

  useEffect(() => {
    if (organization?.id && selectedSeasonId) {
      loadDivisions(organization.id, selectedSeasonId);
    }
  }, [organization?.id, selectedSeasonId]);

  const handleChampionChange = (divName, teamId) => {
    setChampions((prev) => ({ ...prev, [divName]: teamId }));
  };

  const loadSeasons = async (orgId, org) => {
    try {
      const currentSeason = {
        id: 'current',
        name: org?.tournament_name || 'Current Season',
        status: 'active',
      };
      let archived = [];
      try {
        const archivedRes = await base44.functions.invoke('getArchivedSeasons', { organization_id: orgId });
        archived = archivedRes?.data?.seasons || [];
      } catch {}
      const all = [currentSeason, ...archived];
      setSeasons(all);
      if (!selectedSeasonId) setSelectedSeasonId('current');
    } catch (err) {
      console.error('Failed to load seasons:', err);
    }
  };

  const generateReport = async () => {
    if (!selectedSeasonId) return;
    const divisionsWithTeams = divisions.filter((d) => d.teams.length > 0);
    const allChampionsSelected = divisionsWithTeams.every((d) => champions[d.name]);
    if (divisionsWithTeams.length > 0 && !allChampionsSelected) {
      setError('Please select a champion for all divisions before generating the report.');
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const payload = { organization_id: organization?.id };
      if (selectedSeasonId !== 'current') payload.season_id = selectedSeasonId;
      if (Object.keys(champions).length > 0) payload.division_champions = champions;
      const res = await base44.functions.invoke('generateSeasonReport', payload);
      if (res?.data?.error) {
        setError(res.data.error);
      } else {
        setReport(res?.data || null);
      }
    } catch (err) {
      setError(err?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();
  const handleLogout = () => base44.auth.logout(createPageUrl("PublicLanding"));
  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', next.toString());
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <AdminHeader
          user={user}
          organization={organization}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
        />
        <AdminSidebar
          user={user}
          organization={organization}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />
      </div>

      <main className="pt-16 lg:ml-72 min-h-screen">
        <div className="broadcast-brief bg-[#101713] text-[#F5F7F4] min-h-[calc(100vh-4rem)]">
          {/* Masthead */}
          <header className="bg-[#0b100d] border-b-[3px] border-[#25DA67] px-6 md:px-12 py-8 flex flex-col gap-7 bb-rise">
            <h1 className="text-4xl md:text-[68px] font-extrabold uppercase tracking-[0.02em] leading-[1.1] text-[#F5F7F4] flex items-center gap-4">
              <FileText className="w-10 h-10 md:w-12 md:h-12 text-[#25DA67] flex-none" strokeWidth={2.5} />
              Season Report
            </h1>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[260px] flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.16em] font-bold text-[#9fb0a5]">Select Season</span>
                <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                  <SelectTrigger className="h-11 w-full bg-[#354139] border border-[#4a594f] text-[#F5F7F4] hover:border-[#25DA67] focus:border-[#25DA67] rounded-none [&>svg]:text-[#9fb0a5]">
                    <SelectValue placeholder="Choose a season..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#17201a] border border-[#354139] text-[#F5F7F4] rounded-none">
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-[#F5F7F4] focus:bg-[#354139] focus:text-[#25DA67] rounded-none">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {s.name}
                          <span className="text-xs text-[#9fb0a5] capitalize ml-1">({s.status})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                onClick={generateReport}
                disabled={!selectedSeasonId || loading || loadingDivisions || (divisions.filter((d) => d.teams.length > 0).length > 0 && !divisions.filter((d) => d.teams.length > 0).every((d) => champions[d.name]))}
                className="h-11 px-6 inline-flex items-center gap-2.5 text-sm font-extrabold uppercase tracking-[0.1em] cursor-pointer border-2 border-[#25DA67] bg-[#25DA67] text-[#101713] transition-all duration-200 hover:shadow-[0_0_0_3px_rgba(37,218,103,0.3)] active:bg-[#1db455] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F7F4] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Report</>
                )}
              </button>

              {report && !loading && (
                <button
                  onClick={handlePrint}
                  className="h-11 px-6 inline-flex items-center gap-2.5 text-sm font-extrabold uppercase tracking-[0.1em] cursor-pointer border-2 border-[#25DA67] bg-transparent text-[#25DA67] transition-all duration-200 hover:bg-[rgba(37,218,103,0.14)] active:bg-[rgba(37,218,103,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F7F4] bb-no-print"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
              )}
            </div>
          </header>

          {/* Body */}
          <div className="px-6 md:px-12 py-10 md:py-12 flex flex-col gap-11">
            {/* Division champion questionnaire — shown after season selection, before report */}
            {!loading && !report && selectedSeasonId && (
              <DivisionChampionSelector
                divisions={divisions}
                champions={champions}
                onChange={handleChampionChange}
                loading={loadingDivisions}
              />
            )}

            {/* Loading state */}
            {loading && (
              <div className="border border-[#354139] bg-[#17201a] p-10 flex flex-col gap-3 items-center text-center min-h-[210px] justify-center bb-rise">
                <Loader2 className="w-9 h-9 text-[#25DA67] animate-spin" />
                <p className="text-[#9fb0a5] text-sm leading-relaxed">Gathering season data and generating AI insights...</p>
                <p className="text-[#9fb0a5] text-sm">This may take 15-30 seconds</p>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="border border-[rgba(255,92,92,0.5)] bg-[#17201a] p-8 flex flex-col gap-3 items-start text-left min-h-[210px] justify-center bb-rise">
                <AlertCircle className="w-9 h-9 text-[#ff6b6b]" />
                <p className="text-[#F5F7F4] text-base font-bold">Failed to generate report</p>
                <p className="text-[#9fb0a5] text-sm leading-relaxed">{error}</p>
                <button
                  onClick={generateReport}
                  className="h-9 px-5 mt-1 inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.1em] cursor-pointer border-2 border-[#25DA67] bg-transparent text-[#25DA67] hover:bg-[rgba(37,218,103,0.14)] active:bg-[rgba(37,218,103,0.25)] transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !report && !error && (
              <div className="border border-[#354139] bg-[#17201a] p-10 flex flex-col gap-3 items-center text-center min-h-[210px] justify-center bb-rise">
                <FileText className="w-9 h-9 text-[#25DA67] opacity-50" />
                <p className="text-[#F5F7F4] text-base font-bold">No report generated yet</p>
                <p className="text-[#9fb0a5] text-sm leading-relaxed max-w-sm">
                  Select a season above and click Generate Report to view season statistics, top performers, and AI-powered award recommendations.
                </p>
              </div>
            )}

            {/* Report content */}
            {report && !loading && (
              <div className="flex flex-col gap-11">
                {/* Print-only header */}
                <div className="hidden print:block border-b border-gray-400 pb-4 mb-6">
                  <h1 className="text-2xl font-bold text-black">{report.organization?.name} — Season Report</h1>
                  <p className="text-sm text-gray-600">{report.season?.name} ({report.season?.sport}) — Generated {new Date(report.generated_at).toLocaleDateString()}</p>
                </div>

                {/* Screen-only report header */}
                <div className="print:hidden flex justify-between items-end border-b border-[#354139] pb-5 bb-rise-1">
                  <div>
                    <h2 className="text-3xl md:text-[38px] font-extrabold uppercase tracking-[0.02em] text-[#F5F7F4]">{report.organization?.name}</h2>
                    <p className="text-[#9fb0a5] text-sm mt-1.5">
                      {report.season?.name} — <span className="capitalize">{report.season?.sport}</span>
                    </p>
                  </div>
                  <p className="text-xs text-[#9fb0a5]">
                    Generated {new Date(report.generated_at).toLocaleString()}
                  </p>
                </div>

                {/* Organization Summary */}
                <ReportOrgSummary report={report} />

                {/* Division Sections */}
                {report.divisions.map((div) => (
                  <ReportDivisionSection key={div.name} division={div} />
                ))}

                {/* No data state */}
                {report.divisions.length === 0 && (
                  <div className="border border-dashed border-[#354139] p-6 text-center text-[#9fb0a5] text-sm">
                    No division data found for this season. Ensure teams and games are assigned to this season.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}