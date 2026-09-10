import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, BarChart3, Trophy, Users, Calendar, Shield, PlayCircle, Building2, LogOut, Settings, Database, Gauge, Award, MessageCircle, Sparkles, Clock, UserPlus, UserCog, FileEdit, UserCheck, CreditCard, ChevronDown, ChevronRight, Layers, Gamepad2, UsersRound, FileText, Archive, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePermissions } from "@/components/hooks/usePermissions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function AdminSidebar({ 
  user, 
  organization, 
  sidebarOpen, 
  setSidebarOpen, 
  handleLogout,
  navigationItems 
}) {
  const { hasPermission, loading: permissionsLoading, role } = usePermissions();
  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin';

  const [openSections, setOpenSections] = useState({
    leagueSetup: true,
    gameManagement: true,
    personnel: true,
    organization: true,
    reporting: true,
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const superAdminNav = [
    { title: "Super Admin Home", url: createPageUrl("SuperAdminHome"), icon: Home },
    { title: "Analytics Dashboard", url: createPageUrl("SuperAdminDashboard"), icon: Gauge },
    { title: "Subscriptions", url: createPageUrl("SubscriptionManagement"), icon: CreditCard },
    { title: "Admin Approvals", url: createPageUrl("AdminApprovals"), icon: Shield },
  ];

  const adminNav = {
    main: [
      { title: "Home", url: createPageUrl("Home"), icon: Home },
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
      { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3 },
      { title: "Social Feed", url: createPageUrl("SocialFeed"), icon: MessageCircle, permission: "manage_social" },
    ],
    groups: [
      {
        title: "League Setup",
        key: "leagueSetup",
        icon: Layers,
        items: [
          { title: "Divisions", url: createPageUrl("Divisions"), icon: Trophy, permission: "manage_divisions" },
          { title: "Teams", url: createPageUrl("Teams"), icon: Users, permission: "manage_teams" },
          { title: "Players", url: createPageUrl("Players"), icon: Trophy, permission: "manage_players" },
        ]
      },
      {
        title: "Game Management",
        key: "gameManagement",
        icon: Gamepad2,
        items: [
          { title: "Games", url: createPageUrl("Games"), icon: Calendar, permission: "manage_games" },
          { title: "Live Scoring", url: createPageUrl("LiveScoring"), icon: PlayCircle, permission: "live_scoring" },
        ]
      },
      {
        title: "Personnel",
        key: "personnel",
        icon: UsersRound,
        items: [
          { title: "Scorekeepers", url: createPageUrl("Scorekeepers"), icon: Shield, permission: "manage_scorekeepers" },
        ]
      },
      {
        title: "Organization & Billing",
        key: "organization",
        icon: Settings,
        items: [
          { title: "Manage Subscription", url: createPageUrl("SubscriptionCheckout"), icon: CreditCard, permission: "manage_organization" },
          { title: "Organization Settings", url: createPageUrl("OrganizationSettings"), icon: Settings, permission: "manage_organization" },
          { title: "Pending Teams", url: createPageUrl("PendingTeams"), icon: Clock, permission: "manage_teams" },
          { title: "Manual Game Entry", url: createPageUrl("ManualGameEntry"), icon: FileEdit, permission: "manage_games" },
          { title: "Roles & Permissions", url: createPageUrl("RolesPermissions"), icon: UserCog, permission: "manage_roles" },
          { title: "Join Requests", url: createPageUrl("OrganizationJoinRequests"), icon: UserCheck, permission: "manage_members" },
          { title: "Tournament Brackets", url: createPageUrl("TournamentBracket"), icon: Award, permission: "manage_tournaments" },
          { title: "Data Backup", url: createPageUrl("DataBackup"), icon: Database, permission: "data_backup" },
          { title: "Season Manager", url: "/SeasonManager", icon: CalendarCheck },
          { title: "Past Seasons", url: "/PastSeasons", icon: Archive },
        ]
      },
      {
        title: "Reporting",
        key: "reporting",
        icon: FileText,
        items: [
         { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3, permission: "view_statistics" },
         { title: "Weekly Summary", url: createPageUrl("WeeklySummary"), icon: Sparkles, permission: "view_statistics" },
         { title: "Poster Generator", url: createPageUrl("PosterGenerator"), icon: Sparkles, permission: "view_statistics" },
        ]
      },
    ]
  };

  const userNav = {
    main: [
      { title: "Home", url: createPageUrl("Home"), icon: Home },
      ...(organization ? [{ title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 }] : []),
      { title: "Teams", url: createPageUrl("Teams"), icon: Users },
      { title: "Players", url: createPageUrl("Players"), icon: Trophy },
      { title: "Register Team", url: createPageUrl("TeamRegistration"), icon: UserPlus },
      { title: "Join Organization", url: createPageUrl("JoinOrganization"), icon: Building2 },
      { title: "Social Feed", url: createPageUrl("SocialFeed"), icon: MessageCircle },
    ],
    groups: []
  };

  let navStructure;
  let useFlatStructure = false;
  
  if (navigationItems) {
    navStructure = { main: navigationItems, groups: [] };
    useFlatStructure = true;
  } else if (isSuperAdmin) {
    navStructure = { main: superAdminNav, groups: [] };
    useFlatStructure = true;
  } else if (isAdmin) {
    navStructure = adminNav;
  } else if (role) {
    navStructure = adminNav;
  } else {
    navStructure = userNav;
  }

  if (user && (isAdmin || isSuperAdmin) && !navStructure.main.some((item) => item.title === "Statistics")) {
    navStructure.main.push({ title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3 });
  }

  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-background border-r border-border
        transform transition-transform duration-200 ease-out mt-16
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col pt-6 pb-6">
          {organization && (
            <div className="px-4 mb-6">
              <div className="flex items-center gap-3 p-3 border border-border">
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarImage src={organization.logo_url} className="grayscale" />
                  <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-sm">
                    {organization.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-heading font-bold text-foreground truncate">{organization.name}</p>
                  <p className="text-xs text-muted-foreground">Your Organization</p>
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {permissionsLoading && user?.role_id && !isAdmin && !isSuperAdmin ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <>
                {navStructure.main.map((item) => {
                  if (item.permission && !hasPermission(item.permission)) return null;
                  const isActive = window.location.pathname === item.url;
                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.title}
                    </Link>
                  );
                })}

                {navStructure.groups.map((group) => {
                  if (group.key === 'organization' && !hasPermission('manage_organization')) return null;
                  const visibleItems = group.items.filter(item =>
                    (!item.permission || hasPermission(item.permission))
                  );
                  if (visibleItems.length === 0) return null;

                  return (
                    <Collapsible
                      key={group.key}
                      open={openSections[group.key]}
                      onOpenChange={() => toggleSection(group.key)}
                      className="space-y-0.5 mt-4"
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-heading font-bold text-muted-foreground hover:text-foreground transition-colors">
                        <div className="flex items-center gap-3">
                          <group.icon className="w-4 h-4" />
                          <span>{group.title}</span>
                        </div>
                        {openSections[group.key] ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-0.5 pl-4">
                        {visibleItems.map((item) => {
                          const isActive = window.location.pathname === item.url;
                          return (
                            <Link
                              key={item.title}
                              to={item.url}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors ${
                                isActive
                                  ? 'bg-primary text-primary-foreground font-medium'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              }`}
                            >
                              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                              {item.title}
                            </Link>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </>
            )}
          </nav>

          <div className="px-3 pt-4 border-t border-border mt-auto">
            <div className="flex items-center gap-3 mb-3 p-2">
              <div className="w-9 h-9 border border-border flex items-center justify-center">
                <span className="text-xs font-heading font-bold">
                  {user?.full_name?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 mt-16"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </>
  );
}