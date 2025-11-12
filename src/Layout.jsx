
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Trophy, Building2, Users, Calendar, BarChart3,
  PlayCircle, LogOut, Shield, Menu, X, KeyRound, Moon, Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AIAssistant from "@/components/AIAssistant";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadUser();
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      console.log("=== Layout: User loaded ===", currentUser);
      console.log("Layout: onboarding_completed value:", currentUser.onboarding_completed);
      console.log("Layout: role:", currentUser.role);
      console.log("Layout: is_super_admin:", currentUser.is_super_admin);
      console.log("Layout: organization_id:", currentUser.organization_id);
      console.log("Layout: active_organization_id:", currentUser.active_organization_id);
      console.log("Layout: currentPageName:", currentPageName);

      setUser(currentUser);

      // Pages that should never trigger redirects
      const excludedPages = [
        "RoleSelection",
        "RequestAdminAccess",
        "VerifyAdminCode",
        "SuperAdminSetup",
        "Home",
        "PublicLanding",
        "AssociateOrganization",
        "OrganizationSelector"
      ];

      if (excludedPages.includes(currentPageName)) {
        console.log("Layout: On excluded page, no redirects");
        setLoading(false);
        return;
      }

      // PRIORITY #1: Check if user has an APPROVED admin request that hasn't been used yet
      // THIS MUST BE CHECKED FIRST - even before onboarding checks
      // Because a user might be upgraded to admin role but still needs to confirm with code
      console.log("Layout: Checking for approved admin requests...");
      const approvedRequests = await base44.entities.AdminRequest.filter({
        user_email: currentUser.email,
        status: 'approved',
        code_used: false,
      });

      if (approvedRequests.length > 0) {
        console.log("Layout: Found approved request with unused code, redirecting to VerifyAdminCode");
        window.location.href = createPageUrl("VerifyAdminCode");
        return;
      }

      // Check if user needs onboarding
      // A user needs onboarding if onboarding_completed is explicitly NOT true (includes undefined, null, false)
      const needsOnboarding = currentUser.onboarding_completed !== true;
      const isSuperAdmin = currentUser.role === 'admin' && currentUser.is_super_admin === true;

      console.log("Layout: needsOnboarding:", needsOnboarding);
      console.log("Layout: isSuperAdmin:", isSuperAdmin);

      // NEW USERS (no onboarding completed) should go to RoleSelection
      // EXCEPT super admins who are already fully configured
      if (needsOnboarding && !isSuperAdmin) {
        console.log("Layout: User needs onboarding, redirecting to RoleSelection");
        window.location.href = createPageUrl("RoleSelection");
        return;
      }

      // FOR REGULAR USERS: Check if they need to select an active organization
      // Only applies to regular users (not admins), who have completed onboarding
      // but don't have an active_organization_id set
      if (currentUser.role !== 'admin' && currentUser.onboarding_completed === true) {
        console.log("Layout: Regular user, checking for active_organization_id");

        // Check if user has any organization associations
        const userOrgs = await base44.entities.UserOrganization.filter({
          user_id: currentUser.id,
          status: 'active',
        });

        console.log("Layout: User has", userOrgs.length, "organization associations");

        // If user has organizations but no active one selected, redirect to selector
        if (userOrgs.length > 0 && !currentUser.active_organization_id) {
          console.log("Layout: No active organization selected, redirecting to OrganizationSelector");
          window.location.href = createPageUrl("OrganizationSelector");
          return;
        }
      }

      // Load organization if user has organization_id (for admins) or active_organization_id (for regular users)
      const orgId = currentUser.organization_id || currentUser.active_organization_id;
      if (orgId) {
        const orgs = await base44.entities.Organization.list();
        const userOrg = orgs.find(o => o.id === orgId);
        setOrganization(userOrg);
      }

      console.log("Layout: No redirects needed, loading complete");
    } catch (error) {
      console.error("Layout: Error loading user:", error);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin';

  const superAdminNav = [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Organizations", url: createPageUrl("Organizations"), icon: Building2 },
    { title: "All Teams", url: createPageUrl("AllTeams"), icon: Users },
    { title: "All Games", url: createPageUrl("AllGames"), icon: Calendar },
    { title: "Admin Approvals", url: createPageUrl("AdminApprovals"), icon: KeyRound },
  ];

  const adminNav = [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Divisions", url: createPageUrl("Divisions"), icon: Trophy },
    { title: "Teams", url: createPageUrl("Teams"), icon: Users },
    { title: "Players", url: createPageUrl("Players"), icon: Trophy },
    { title: "Games", url: createPageUrl("Games"), icon: Calendar },
    { title: "Scorekeepers", url: createPageUrl("Scorekeepers"), icon: Shield },
    { title: "Live Scoring", url: createPageUrl("LiveScoring"), icon: PlayCircle },
    { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3 },
  ];

  const navigationItems = isSuperAdmin ? superAdminNav : (isAdmin ? adminNav : []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Pages that don't need layout
  if (currentPageName === "Home" || currentPageName === "SuperAdminSetup" ||
      currentPageName === "RequestAdminAccess" || currentPageName === "VerifyAdminCode" ||
      currentPageName === "PublicLanding" || currentPageName === "RoleSelection" ||
      currentPageName === "AssociateOrganization" || currentPageName === "OrganizationSelector") {
    return <div>{children}</div>;
  }

  if (!user) {
    return <div>{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ALWAYS VISIBLE TOP HEADER WITH LOGOUT */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-3">
            {organization?.logo_url ? (
              <Avatar className="w-10 h-10 border-2 border-orange-500 shadow-lg">
                <AvatarImage src={organization.logo_url} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black">
                  {organization.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
              </div>
            )}
            <div>
              <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">
                {organization?.name || 'ALAB'}
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1 font-medium tracking-wide">
                {organization ? 'ORGANIZATION' : 'SPORTS LEAGUE'}
              </p>
            </div>
            {isSuperAdmin && (
              <span className="ml-2 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1 rounded-full font-semibold shadow-sm">
                SUPER ADMIN
              </span>
            )}
          </div>
        </div>

        {/* ALWAYS VISIBLE CONTROLS */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <Button
            onClick={toggleDarkMode}
            variant="ghost"
            size="icon"
            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          <div className="hidden md:flex items-center gap-3 text-sm">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold text-white">
                {user?.full_name?.[0] || 'U'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{user?.full_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role === 'admin' ? 'Administrator' : 'User'}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-md"
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop Always Visible */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-200 ease-in-out mt-16 lg:mt-0 shadow-lg lg:shadow-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="h-full flex flex-col pt-6">
            {/* Organization Info in Sidebar */}
            {organization && (
              <div className="px-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl border-2 border-orange-200 dark:border-orange-800">
                  <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-lg">
                    <AvatarImage src={organization.logo_url} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-sm">
                      {organization.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">{organization.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Your Organization</p>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.title}
                  </Link>
                );
              })}

              {isAdmin && !isSuperAdmin && (
                <Link
                  to={createPageUrl("SuperAdminSetup")}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 mt-4 border-t border-gray-200 dark:border-gray-700 pt-6"
                >
                  <Shield className="w-5 h-5" />
                  Super Admin Setup
                </Link>
              )}
            </nav>

            {/* Sidebar Footer with User Info and Logout */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">
                    {user?.full_name?.[0] || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-700 font-semibold"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 lg:mt-0">
          {children}
        </main>
      </div>

      {/* AI Assistant - Available on all pages */}
      <AIAssistant />
    </div>
  );
}
