import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Sparkles, Loader2, FileText, AlertCircle, Calendar } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import ReportOrgSummary from "@/components/season-report/ReportOrgSummary";
import ReportDivisionSection from "@/components/season-report/ReportDivisionSection";
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
        const orgId = res?.data?.organization?.id;
        if (orgId) await loadSeasons(orgId);
      } catch { setOrganization(null); }
    } catch {
      base44.auth.redirectToLogin(createPageUrl("SeasonReport"));
    }
  };

  const loadSeasons = async (orgId) => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        base44.functions.invoke('getActiveSeason', { organization_id: orgId }),
        base44.functions.invoke('getArchivedSeasons', { organization_id: orgId }),
      ]);
      const active = activeRes?.data?.season ? [activeRes.data.season] : [];
      const archived = archivedRes?.data?.seasons || [];
      const all = [...active, ...archived];
      setSeasons(all);
      if (all.length > 0 && !selectedSeasonId) setSelectedSeasonId(all[0].id);
    } catch (err) {
      console.error('Failed to load seasons:', err);
    }
  };

  const generateReport = async () => {
    if (!selectedSeasonId) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await base44.functions.invoke('generateSeasonReport', { season_id: selectedSeasonId });
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
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {/* Controls — hidden in print */}
          <div className="print:hidden mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-7 h-7 text-primary" />
              <h1 className="text-3xl font-heading font-bold text-foreground">Season Report</h1>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Select Season</label>
                <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a season..." />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {s.name}
                          <span className="text-xs text-muted-foreground capitalize ml-1">({s.status})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={generateReport}
                disabled={!selectedSeasonId || loading}
                className="h-10"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Report</>
                )}
              </Button>
              {report && !loading && (
                <Button onClick={handlePrint} variant="outline" className="h-10">
                  <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
                </Button>
              )}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Gathering season data and generating AI insights...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take 15-30 seconds</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="border border-destructive/30 bg-destructive/5 p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Failed to generate report</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button onClick={generateReport} variant="outline" size="sm" className="mt-3">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !report && !error && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-base font-medium text-foreground">No report generated yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Select a season above and click Generate Report to view season statistics, top performers, and AI-powered award recommendations.
              </p>
            </div>
          )}

          {/* Report content */}
          {report && !loading && (
            <div className="space-y-10">
              {/* Print-only header */}
              <div className="hidden print:block border-b border-border pb-4 mb-6">
                <h1 className="text-2xl font-bold">{report.organization?.name} - Season Report</h1>
                <p className="text-sm text-gray-600">{report.season?.name} ({report.season?.sport}) - Generated {new Date(report.generated_at).toLocaleDateString()}</p>
              </div>

              {/* Report header (screen only) */}
              <div className="print:hidden border-b border-border pb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-foreground">{report.organization?.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {report.season?.name} - <span className="capitalize">{report.season?.sport}</span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generated {new Date(report.generated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Organization Summary */}
              <ReportOrgSummary report={report} />

              {/* Division Sections */}
              {report.divisions.map((div) => (
                <ReportDivisionSection key={div.name} division={div} />
              ))}

              {/* No data state */}
              {report.divisions.length === 0 && (
                <div className="border border-border bg-muted/30 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No division data found for this season. Ensure teams and games are assigned to this season.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}