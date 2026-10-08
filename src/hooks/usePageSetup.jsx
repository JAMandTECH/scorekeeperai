import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';

/**
 * Shared page setup hook for player-profile pages.
 * Encapsulates user, organization, dark mode, sidebar, and logout
 * so each page doesn't repeat the boilerplate.
 */
export function usePageSetup() {
  const { user, isLoadingAuth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true';
    setDarkMode(saved);
    if (saved) document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', next.toString());
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', user?.organization_id || user?.active_organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
    },
    enabled: !!(user && (user?.organization_id || user?.active_organization_id)),
  });

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
  };

  return {
    user,
    organization,
    isLoading: isLoadingAuth || (!!user && orgLoading && !organization),
    sidebarOpen,
    setSidebarOpen,
    darkMode,
    toggleDarkMode,
    handleLogout,
  };
}