import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
  Trophy, Building2, Users, Calendar, BarChart3, 
  PlayCircle, Menu, LogOut, Shield 
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Home"));
  };

  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin';

  const superAdminNav = [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Organizations", url: createPageUrl("Organizations"), icon: Building2 },
    { title: "All Teams", url: createPageUrl("AllTeams"), icon: Users },
    { title: "All Games", url: createPageUrl("AllGames"), icon: Calendar },
  ];

  const adminNav = [
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Teams", url: createPageUrl("Teams"), icon: Users },
    { title: "Players", url: createPageUrl("Players"), icon: Trophy },
    { title: "Games", url: createPageUrl("Games"), icon: Calendar },
    { title: "Live Scoring", url: createPageUrl("LiveScoring"), icon: PlayCircle },
    { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3 },
  ];

  const navigationItems = isSuperAdmin ? superAdminNav : (isAdmin ? adminNav : []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (currentPageName === "Home" || currentPageName === "SuperAdminSetup") {
    return <div>{children}</div>;
  }

  if (!user) {
    return <div>{children}</div>;
  }

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --alab-yellow: #FFD700;
          --alab-dark: #0a0a0a;
          --alab-gray: #1a1a1a;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gray-950">
        <Sidebar className="border-r border-gray-800 bg-gray-900">
          <SidebarHeader className="border-b border-gray-800 p-4 bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-gray-900" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">ALAB</h2>
                <p className="text-xs text-yellow-400">
                  {isSuperAdmin ? 'Super Admin' : 'Admin Panel'}
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2 bg-gray-900">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-gray-800 hover:text-yellow-400 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-gray-800 text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  
                  {isAdmin && !isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        className="hover:bg-yellow-400/10 hover:text-yellow-400 transition-colors duration-200 rounded-lg mb-1 text-gray-300 mt-4"
                      >
                        <Link to={createPageUrl("SuperAdminSetup")} className="flex items-center gap-3 px-3 py-2">
                          <Shield className="w-4 h-4" />
                          <span className="font-medium">Super Admin Setup</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-800 p-4 bg-gray-900">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  {isSuperAdmin ? <Shield className="w-4 h-4 text-gray-900" /> : <span className="text-gray-900 font-bold text-sm">{user?.full_name?.[0] || 'U'}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-800 p-2 rounded-lg transition-colors duration-200 text-white" />
              <h1 className="text-xl font-semibold text-white">ALAB System</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-gray-950">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}