import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadUser();
    
    // Poll for user updates every 5 seconds to catch role changes
    const interval = setInterval(loadUser, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      console.log("usePermissions - Loaded user:", currentUser);
      console.log("usePermissions - User role_id:", currentUser?.role_id);
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', user?.role_id],
    queryFn: async () => {
      if (!user?.role_id) {
        console.log("usePermissions - No role_id found");
        return null;
      }
      console.log("usePermissions - Fetching role for role_id:", user.role_id);
      const roles = await base44.entities.Role.list();
      console.log("usePermissions - All roles:", roles);
      const foundRole = roles.find(r => r.id === user.role_id);
      console.log("usePermissions - Found role:", foundRole);
      return foundRole;
    },
    enabled: !!user?.role_id,
  });

  const hasPermission = (permissionKey) => {
    const isAdmin = user?.role === 'admin';
    const isSuperAdmin = isAdmin && user?.is_super_admin === true;

    // 1) Super admin: full access
    if (isSuperAdmin) return true;

    // 2) If a custom role is assigned, rely strictly on its permissions
    if (user?.role_id) {
      return role?.permissions?.[permissionKey] === true;
    }

    // 3) If no custom role assigned but user is built-in admin, allow
    if (!user?.role_id && isAdmin) return true;

    // 4) Default deny
    return false;
  };

  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;

  return {
    user,
    role,
    loading: loading || roleLoading,
    hasPermission,
    isAdmin,
    isSuperAdmin,
    refresh,
  };
}