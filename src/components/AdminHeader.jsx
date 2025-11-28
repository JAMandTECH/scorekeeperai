import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X, LogOut, Sun, Moon, Home, BarChart3, Trophy, Users, Calendar, Shield, PlayCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationBell from "@/components/NotificationBell";

export default function AdminHeader({ 
  user, 
  organization, 
  darkMode, 
  toggleDarkMode, 
  handleLogout, 
  sidebarOpen, 
  setSidebarOpen 
}) {
  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin' && !user?.is_super_admin;
  const isScorekeeper = user?.is_scorekeeper === true && user?.role !== 'admin';
  
  const userRoleLabel = isSuperAdmin ? 'Super Administrator' : (isAdmin ? 'Administrator' : (isScorekeeper ? 'Scorekeeper' : 'User'));

  // Apply organization theme colors on mount and when organization changes
  useEffect(() => {
    if (organization?.theme) {
      const { primary_color, secondary_color, accent_color } = organization.theme;
      document.documentElement.style.setProperty('--org-primary', primary_color || '#3b82f6');
      document.documentElement.style.setProperty('--org-secondary', secondary_color || '#f97316');
      document.documentElement.style.setProperty('--org-accent', accent_color || '#8b5cf6');
      document.documentElement.style.setProperty('--org-primary-light', `${primary_color || '#3b82f6'}20`);
      document.documentElement.style.setProperty('--org-secondary-light', `${secondary_color || '#f97316'}20`);
      document.documentElement.style.setProperty('--org-accent-light', `${accent_color || '#8b5cf6'}20`);
    }
  }, [organization?.theme]);

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 h-16 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-50 shadow-futuristic">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-blue-500/10 dark:hover:from-cyan-500/20 dark:hover:to-blue-500/20 transition-all duration-300 group"
          title="Toggle Navigation Menu"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
          ) : (
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
          )}
        </button>
        <div className="flex items-center gap-3">
          {organization?.logo_url ? (
            <Avatar className="w-10 h-10 border-2 border-cyan-500/50 shadow-lg ring-2 ring-cyan-500/20">
              <AvatarImage src={organization.logo_url} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black">
                {organization.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg neon-glow-orange">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
          )}
          <div className="hidden sm:block">
            <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">
              {organization?.name || 'ALAB'}
            </span>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1 font-medium tracking-wide">
              {organization?.tournament_name || (organization ? 'ORGANIZATION' : 'SPORTS LEAGUE')}
            </p>
          </div>
          {isSuperAdmin && (
            <span className="hidden lg:inline-block ml-2 text-xs bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white px-3 py-1.5 rounded-full font-bold shadow-lg animate-pulse">
              SUPER ADMIN
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell 
          user={user} 
          organizationId={organization?.id || user?.organization_id || user?.active_organization_id} 
        />
        
        <Button
          onClick={toggleDarkMode}
          variant="ghost"
          size="icon"
          className="text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-purple-500/10 dark:hover:from-cyan-500/20 dark:hover:to-purple-500/20 rounded-xl transition-all duration-300"
        >
          {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-600" />}
        </Button>

        <div className="hidden lg:flex items-center gap-3 text-sm">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-sm font-bold text-white">
              {user?.full_name?.[0] || 'U'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{user?.full_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{userRoleLabel}</p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          className="bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-red-700 hover:to-pink-700 text-white font-bold shadow-lg rounded-xl transition-all duration-300 hover:scale-105"
          size="sm"
        >
          <LogOut className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}