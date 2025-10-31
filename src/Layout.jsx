import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  Building2,
  Settings,
  LogOut,
  Menu,
  UserCircle,
  ChevronDown,
  Shield,
  Award,
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  // Public pages don't need sidebar
  const publicPages = ["Home", "Landing"];
  if (publicPages.includes(currentPageName) || !user) {
    return <div className="min-h-screen">{children}</div>;
  }

  const isSuperAdmin = user?.user_type === "super_admin";
  const isOrgAdmin = user?.user_type === "org_admin";

  const superAdminNav = [
    {
      title: "Dashboard",
      url: createPageUrl("SuperAdminDashboard"),
      icon: LayoutDashboard,
    },
    {
      title: "Organizations",
      url: createPageUrl("Organizations"),
      icon: Building2,
    },
    {
      title: "All Games",
      url: createPageUrl("AllGames"),
      icon: Trophy,
    },
  ];

  const orgAdminNav = [
    {
      title: "Dashboard",
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
    },
    {
      title: "Games",
      url: createPageUrl("Games"),
      icon: Trophy,
    },
    {
      title: "Teams",
      url: createPageUrl("Teams"),
      icon: Users,
    },
    {
      title: "Players",
      url: createPageUrl("Players"),
      icon: Award,
    },
    {
      title: "Schedule",
      url: createPageUrl("Schedule"),
      icon: Calendar,
    },
  ];

  const navigationItems = isSuperAdmin ? superAdminNav : orgAdminNav;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="border-b border-slate-200 p-6 bg-gradient-to-r from-yellow-400 to-orange-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                <Trophy className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">ALAB Sports</h2>
                <p className="text-xs text-white/80">
                  {isSuperAdmin ? "Super Admin" : "Organization Portal"}
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                {isSuperAdmin ? "System Management" : "Management"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url
                            ? "bg-orange-50 text-orange-600 font-semibold"
                            : ""
                        }`}
                      >
                        <Link
                          to={item.url}
                          className="flex items-center gap-3 px-3 py-2.5"
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-4">
            <div className="space-y-3">
              {/* User Info */}
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center">
                  {isSuperAdmin ? (
                    <Shield className="w-5 h-5 text-white" />
                  ) : (
                    <UserCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {user?.full_name || "User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-4 lg:hidden shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors">
                  <Menu className="w-5 h-5" />
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-orange-500" />
                  <h1 className="text-xl font-bold text-slate-900">
                    ALAB Sports
                  </h1>
                </div>
              </div>
              {/* Mobile Logout */}
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}