import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export function usePermissions() {
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

  const { data: role } = useQuery({
    queryKey: ['user-role', user?.role_id],
    queryFn: async () => {
      if (!user?.role_id) return null;
      const roles = await base44.entities.Role.list();
      return roles.find(r => r.id === user.role_id);
    },
    enabled: !!user?.role_id,
  });

  const hasPermission = (permissionKey) => {
    // Super admins have all permissions
    if (user?.role === 'admin' && user?.is_super_admin === true) {
      return true;
    }

    // Regular admins have all permissions
    if (user?.role === 'admin') {
      return true;
    }

    // Check role-based permissions
    if (role?.permissions?.[permissionKey] === true) {
      return true;
    }

    return false;
  };

  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;

  return {
    user,
    role,
    loading,
    hasPermission,
    isAdmin,
    isSuperAdmin,
  };
}