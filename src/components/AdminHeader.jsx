import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, LogOut, Sun, Moon, CalendarCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationBell from "@/components/NotificationBell";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";

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

  const orgId = organization?.id || user?.active_organization_id || user?.organization_id;
  const { data: activeSeason } = useQuery({
    queryKey: ['active-season', orgId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getActiveSeason', { organization_id: orgId });
      return res.data?.season || null;
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  return (
    <header className="bg-background border-b border-border h-16 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-sm hover:bg-muted transition-colors"
          title="Toggle Navigation Menu"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Menu className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
        <div className="flex items-center gap-3">
          {organization?.logo_url ? (
            <Avatar className="w-9 h-9 border border-border">
              <AvatarImage src={organization.logo_url} className="grayscale" />
              <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-sm">
                {organization.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-9 h-9 border border-border flex items-center justify-center">
              <span className="font-heading text-sm font-bold">
                {organization?.name?.substring(0, 2).toUpperCase() || 'SK'}
              </span>
            </div>
          )}
          <div className="hidden sm:block">
            <span className="font-heading font-bold text-lg text-foreground tracking-tight block leading-tight">
              {organization?.name || 'ScorekeeperAI'}
            </span>
            <p className="text-[10px] text-muted-foreground tracking-wide uppercase">
              {organization?.tournament_name || (organization ? 'Organization' : 'Sports League')}
            </p>
          </div>
          {isSuperAdmin && (
            <span className="hidden lg:inline-block ml-2 text-xs text-primary border border-primary px-2 py-0.5 font-medium">
              SUPER ADMIN
            </span>
          )}
          {activeSeason && (
            <Link to="/PastSeasons" className="hidden md:inline-flex items-center gap-1.5 ml-2 text-xs font-medium px-2.5 py-1 border border-border text-primary hover:bg-muted transition-colors" title="Active season — click to view past seasons">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span className="max-w-[140px] truncate">{activeSeason.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <OrganizationSwitcher 
          user={user} 
          currentOrganization={organization}
          onSwitch={() => window.location.reload()}
        />
        
        <NotificationBell 
          user={user} 
          organizationId={organization?.id || user?.organization_id || user?.active_organization_id} 
        />
        
        <Button
          onClick={toggleDarkMode}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <div className="hidden lg:flex items-center gap-3 text-sm pl-2 border-l border-border ml-1">
          <div className="w-8 h-8 border border-border flex items-center justify-center">
            <span className="text-xs font-heading font-bold">
              {user?.full_name?.[0] || 'U'}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground text-sm leading-tight">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground">{userRoleLabel}</p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
        >
          <LogOut className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}