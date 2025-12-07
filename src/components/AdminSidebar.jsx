import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, BarChart3, Trophy, Users, Calendar, Shield, PlayCircle, Building2, LogOut, Settings, Database, Gauge, Award, MessageCircle, Sparkles, Clock, UserPlus, UserCog, FileEdit, UserCheck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePermissions } from "@/components/hooks/usePermissions";

export default function AdminSidebar({ 
  user, 
  organization, 
  sidebarOpen, 
  setSidebarOpen, 
  handleLogout,
  navigationItems 
}) {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin';

  const superAdminNav = [
    { title: "Super Admin Home", url: createPageUrl("SuperAdminHome"), icon: Home },
    { title: "Analytics Dashboard", url: createPageUrl("SuperAdminDashboard"), icon: Gauge },
    { title: "Subscriptions", url: createPageUrl("SubscriptionManagement"), icon: CreditCard },
  ];

  const adminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: Home },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Manage Subscription", url: createPageUrl("SubscriptionCheckout"), icon: CreditCard },
    { title: "Divisions", url: createPageUrl("Divisions"), icon: Trophy, permission: "manage_divisions" },
    { title: "Teams", url: createPageUrl("Teams"), icon: Users, permission: "manage_teams" },
    { title: "Players", url: createPageUrl("Players"), icon: Trophy, permission: "manage_players" },
    { title: "Pending Teams", url: createPageUrl("PendingTeams"), icon: Clock, permission: "manage_teams" },
    { title: "Games", url: createPageUrl("Games"), icon: Calendar, permission: "manage_games" },
    { title: "Manual Entry", url: createPageUrl("ManualGameEntry"), icon: FileEdit, permission: "manage_games" },
    { title: "Weekly Summary", url: createPageUrl("WeeklySummary"), icon: Sparkles, permission: "view_statistics" },
    { title: "Tournament Brackets", url: createPageUrl("TournamentBracket"), icon: Award, permission: "manage_tournaments" },
    { title: "Scorekeepers", url: createPageUrl("Scorekeepers"), icon: Shield, permission: "manage_scorekeepers" },
    { title: "Live Scoring", url: createPageUrl("LiveScoring"), icon: PlayCircle, permission: "live_scoring" },
    { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3, permission: "view_statistics" },
    { title: "Social Feed", url: createPageUrl("SocialFeed"), icon: MessageCircle, permission: "manage_social" },
    { title: "Roles & Permissions", url: createPageUrl("RolesPermissions"), icon: UserCog, permission: "manage_roles" },
    { title: "Join Requests", url: createPageUrl("OrganizationJoinRequests"), icon: UserCheck, permission: "manage_members" },
    { title: "Data Backup", url: createPageUrl("DataBackup"), icon: Database, permission: "data_backup" },
    { title: "Organization Settings", url: createPageUrl("OrganizationSettings"), icon: Settings, permission: "manage_organization" },
  ];

  const userNav = [
    { title: "Home", url: createPageUrl("Home"), icon: Home },
    { title: "Register Team", url: createPageUrl("TeamRegistration"), icon: UserPlus },
    { title: "Join Organization", url: createPageUrl("JoinOrganization"), icon: Building2 },
    { title: "Social Feed", url: createPageUrl("SocialFeed"), icon: MessageCircle },
  ];

  // Determine which nav array to use
  let baseNavItems;
  if (navigationItems) {
    baseNavItems = navigationItems;
  } else if (isSuperAdmin) {
    baseNavItems = superAdminNav;
  } else if (isAdmin) {
    baseNavItems = adminNav;
  } else {
    // All regular users (with or without role_id) get userNav by default
    // This ensures they always have access to basic features like Social Feed
    baseNavItems = userNav;
  }
  
  // Filter nav items based on permissions for non-super-admin users
  let navItems = baseNavItems;

  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50
        transform transition-all duration-300 ease-out mt-16 shadow-futuristic-lg
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col pt-6 pb-6">
          {organization && (
            <div className="px-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-cyan-50/50 via-blue-50/50 to-purple-50/50 dark:from-cyan-950/30 dark:via-blue-950/30 dark:to-purple-950/30 rounded-2xl border border-cyan-200/50 dark:border-cyan-800/50 shadow-lg">
                <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-lg ring-2 ring-cyan-500/20">
                  <AvatarImage src={organization.logo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white font-black text-sm">
                    {organization.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">{organization.name}</p>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">Your Organization</p>
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            {permissionsLoading && user?.role_id && !isAdmin && !isSuperAdmin ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              </div>
            ) : navItems.length === 0 && user?.role_id ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No menu items available. Contact admin to assign permissions to your role.</p>
              </div>
            ) : (
              navItems.map((item) => {
                const isActive = window.location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 group ${
                      isActive
                        ? 'text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-purple-500/10 dark:hover:from-cyan-500/20 dark:hover:to-purple-500/20'
                    }`}
                    style={isActive ? {
                      background: organization?.theme?.primary_color 
                        ? `linear-gradient(to right, ${organization.theme.primary_color}, ${organization.theme.accent_color || organization.theme.primary_color})`
                        : 'linear-gradient(to right, #06b6d4, #8b5cf6)'
                    } : undefined}
                  >
                    <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                    {item.title}
                  </Link>
                );
              })
            )}
          </nav>

          <div className="px-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 mt-auto bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-800/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gradient-to-r from-cyan-500/5 to-purple-500/5 dark:from-cyan-500/10 dark:to-purple-500/10 border border-cyan-200/30 dark:border-cyan-800/30">
              <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-sm font-bold text-white">
                  {user?.full_name?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-red-500 dark:text-red-400 border-red-200/50 dark:border-red-800/50 hover:bg-gradient-to-r hover:from-red-500/10 hover:to-pink-500/10 dark:hover:from-red-500/20 dark:hover:to-pink-500/20 hover:text-red-600 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-700 font-bold rounded-xl transition-all duration-300"
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
          className="fixed inset-0 bg-gradient-to-br from-gray-900/60 via-blue-900/40 to-purple-900/60 dark:from-black/80 dark:via-blue-950/60 dark:to-purple-950/80 z-30 backdrop-blur-md mt-16"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </>
  );
}