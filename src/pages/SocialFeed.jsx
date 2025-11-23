import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Home as HomeIcon, MessageCircle, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import PostCreator from "@/components/social/PostCreator";
import SocialPostCard from "@/components/social/SocialPostCard";
import { usePermissions } from "@/components/hooks/usePermissions";

export default function SocialFeed() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
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
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("SocialFeed"));
    }
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Home"));
  };

  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', user?.organization_id || user?.active_organization_id],
    queryFn: async () => {
      const orgId = user?.organization_id || user?.active_organization_id;
      if (!orgId) return null;
      
      const orgs = await base44.entities.Organization.list();
      const org = orgs.find(o => o.id === orgId);
      return org || null;
    },
    enabled: !!(user?.organization_id || user?.active_organization_id),
  });

  const { data: posts = [], refetch: refetchPosts } = useQuery({
    queryKey: ['social-posts', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return await base44.entities.SocialPost.filter({ 
        organization_id: organization.id 
      }, '-created_date');
    },
    enabled: !!organization?.id,
  });

  // Determine navigation based on user role
  let navigationItems = null;
  
  if (user?.is_scorekeeper && user?.role !== 'admin') {
    // Scorekeeper navigation
    navigationItems = [
      { title: "Organization Home", url: createPageUrl("Home"), icon: HomeIcon },
      { title: "My Games", url: createPageUrl("ScorekeeperDashboard"), icon: Clipboard },
      { title: "Social Feed", url: createPageUrl("SocialFeed"), icon: MessageCircle },
    ];
  } else if (user?.role !== 'admin' && !user?.role_id) {
    // Regular user navigation (WITHOUT role_id - basic users only)
    navigationItems = [
      { title: "Organization Home", url: createPageUrl("Home"), icon: HomeIcon },
      { title: "Social Feed", url: createPageUrl("SocialFeed"), icon: Users },
    ];
  }
  // Admins and users with role_id get null (AdminSidebar will filter based on permissions)

  if (!user || orgLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-200 to-orange-300 dark:from-red-800 dark:to-orange-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">No Organization Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to be associated with an organization to access the social feed.
          </p>
          <Button
            onClick={() => navigate(createPageUrl("Home"))}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
          >
            <HomeIcon className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900">
      <AdminHeader 
        user={user}
        organization={organization}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex">
        <AdminSidebar 
          user={user}
          organization={organization}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
          navigationItems={navigationItems}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">Social Feed</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    Share updates, photos, and videos with {organization.name}
                  </p>
                </div>
                <Button
                  onClick={() => navigate(createPageUrl("Home"))}
                  variant="outline"
                  className="font-bold"
                >
                  <HomeIcon className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </div>

              <PostCreator 
                user={user} 
                organizationId={organization.id}
                onPostCreated={refetchPosts}
              />

              <div className="space-y-4">
                {posts.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-200 to-indigo-300 dark:from-blue-800 dark:to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No posts yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                      Be the first to share something with your organization!
                    </p>
                  </div>
                )}

                {posts.map(post => (
                  <SocialPostCard
                    key={post.id}
                    post={post}
                    user={user}
                    canDelete={user.role === 'admin' || post.user_id === user.id}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}