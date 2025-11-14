import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X, LogOut, Sun, Moon, Home, BarChart3, Trophy, Users, Calendar, Shield, PlayCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Toggle Navigation Menu"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          )}
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
          <div className="hidden sm:block">
            <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">
              {organization?.name || 'ALAB'}
            </span>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1 font-medium tracking-wide">
              {organization ? 'ORGANIZATION' : 'SPORTS LEAGUE'}
            </p>
          </div>
          {isSuperAdmin && (
            <span className="hidden lg:inline-block ml-2 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1 rounded-full font-semibold shadow-sm">
              SUPER ADMIN
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={toggleDarkMode}
          variant="ghost"
          size="icon"
          className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        <div className="hidden lg:flex items-center gap-3 text-sm">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-sm font-bold text-white">
              {user?.full_name?.[0] || 'U'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{user?.full_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-md"
          size="sm"
        >
          <LogOut className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}