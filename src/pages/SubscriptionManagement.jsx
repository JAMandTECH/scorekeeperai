import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Crown, Star, Gift, Calendar, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function SubscriptionManagement() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [editingOrg, setEditingOrg] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAccess();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Realtime: auto-refresh when orgs change (Stripe webhook updates)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = base44.entities.Organization.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['all-organizations-subscriptions'] });
    });
    return unsubscribe;
  }, [user]);

  const checkAccess = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin' || !currentUser.is_super_admin) {
        navigate(createPageUrl("Dashboard"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin(createPageUrl("SubscriptionManagement"));
    }
    setLoading(false);
  };

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

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Home"));
  };

  const { data: organizations = [] } = useQuery({
    queryKey: ['all-organizations-subscriptions'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    enabled: !!user,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams-subscriptions'],
    queryFn: () => base44.entities.Team.list(),
    enabled: !!user,
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ orgId, data }) => {
      return await base44.entities.Organization.update(orgId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-organizations-subscriptions']);
      setEditingOrg(null);
    },
  });

  const handleEditSubscription = (org) => {
    setEditingOrg({
      ...org,
      subscription_tier: org.subscription_tier || 'free',
      subscription_status: org.subscription_status || 'trial',
      selected_sport: org.selected_sport || 'basketball',
    });
  };

  const handleSaveSubscription = async () => {
    if (!editingOrg) return;

    const updateData = {
      subscription_tier: editingOrg.subscription_tier,
      subscription_status: editingOrg.subscription_status,
    };

    // Add trial_end_date if status is trial and not set
    if (editingOrg.subscription_status === 'trial' && !editingOrg.trial_end_date) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);
      updateData.trial_end_date = trialEnd.toISOString();
    }

    // Add selected_sport for basic tier
    if (editingOrg.subscription_tier === 'basic') {
      updateData.selected_sport = editingOrg.selected_sport;
    }

    updateSubscriptionMutation.mutate({
      orgId: editingOrg.id,
      data: updateData,
    });

    // Mirror changes to admin users of the org so dashboards reflect immediately
    try {
      const admins = await base44.entities.User.filter({
        role: 'admin',
        $or: [{ organization_id: editingOrg.id }, { active_organization_id: editingOrg.id }]
      });
      await Promise.allSettled(
        admins.map(u => base44.entities.User.update(u.id, {
          subscription_tier: editingOrg.subscription_tier,
          subscription_status: editingOrg.subscription_status
        }))
      );
    } catch (e) {
      console.warn('Could not mirror admin users on manual change:', e?.message || e);
    }
  };

  const getTierIcon = (tier) => {
    if (tier === 'premium') return <Crown className="w-5 h-5 text-purple-600" />;
    if (tier === 'basic') return <Star className="w-5 h-5 text-blue-600" />;
    return <Gift className="w-5 h-5 text-gray-600" />;
  };

  const getTierBadgeClass = (tier) => {
    if (tier === 'premium') return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0';
    if (tier === 'basic') return 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0';
    return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800';
    if (status === 'trial') return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    if (status === 'expired') return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  const getOrgTeamCount = (orgId) => {
    return allTeams.filter(t => t.organization_id === orgId).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const freeOrgs = organizations.filter(o => (o.subscription_tier || 'free') === 'free');
  const basicOrgs = organizations.filter(o => o.subscription_tier === 'basic');
  const premiumOrgs = organizations.filter(o => o.subscription_tier === 'premium');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900">
      <AdminHeader 
        user={user}
        organization={null}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex">
        <AdminSidebar 
          user={user}
          organization={null}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Management</h1>
                  <p className="text-gray-600 dark:text-gray-400">Manage organization subscription tiers and access</p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Free Tier</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{freeOrgs.length}</p>
                      </div>
                      <Gift className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Basic Tier</p>
                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">{basicOrgs.length}</p>
                      </div>
                      <Star className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">Premium Tier</p>
                        <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">{premiumOrgs.length}</p>
                      </div>
                      <Crown className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Organizations List */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                <CardHeader className="border-b-2 border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-xl font-black text-gray-900 dark:text-white">All Organizations</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                          <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">ORGANIZATION</th>
                          <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TEAMS</th>
                          <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TIER</th>
                          <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">STATUS</th>
                          <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">SPORT</th>
                          <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TRIAL END</th>
                          <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {organizations.map((org) => (
                          <tr key={org.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                                  <AvatarImage src={org.logo_url} />
                                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold">
                                    {org.name?.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white">{org.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{org.contact_email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Badge variant="outline" className="font-bold">
                                <Users className="w-3 h-3 mr-1" />
                                {getOrgTeamCount(org.id)}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Badge className={getTierBadgeClass(org.subscription_tier || 'free')}>
                                {getTierIcon(org.subscription_tier || 'free')}
                                <span className="ml-1 font-bold uppercase">{org.subscription_tier || 'free'}</span>
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Badge className={getStatusBadgeClass(org.subscription_status || 'trial')}>
                                {(org.subscription_status || 'trial').toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-center text-gray-900 dark:text-white font-semibold">
                              {org.subscription_tier === 'basic' ? (
                                <Badge variant="outline">{org.selected_sport?.toUpperCase() || 'NOT SET'}</Badge>
                              ) : org.subscription_tier === 'premium' ? (
                                <span className="text-purple-600 dark:text-purple-400">ALL</span>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                              {org.subscription_status === 'trial' && org.trial_end_date ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(org.trial_end_date).toLocaleDateString()}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Button
                                onClick={() => handleEditSubscription(org)}
                                size="sm"
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                              >
                                Manage
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editingOrg} onOpenChange={() => setEditingOrg(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Manage Subscription</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Set subscription tier and status for {editingOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Subscription Tier</Label>
              <Select
                value={editingOrg?.subscription_tier || 'free'}
                onValueChange={(value) => setEditingOrg({...editingOrg, subscription_tier: value})}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      Free
                    </div>
                  </SelectItem>
                  <SelectItem value="basic">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Basic - AUD $35/month
                    </div>
                  </SelectItem>
                  <SelectItem value="premium">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      Premium - AUD $50/month
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editingOrg?.subscription_tier === 'basic' && (
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Selected Sport (Basic Tier Only)</Label>
                <Select
                  value={editingOrg?.selected_sport || 'basketball'}
                  onValueChange={(value) => setEditingOrg({...editingOrg, selected_sport: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="volleyball">Volleyball</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-gray-700 dark:text-gray-300">Subscription Status</Label>
              <Select
                value={editingOrg?.subscription_status || 'trial'}
                onValueChange={(value) => setEditingOrg({...editingOrg, subscription_status: value})}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (30 days)</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
              <p className="font-bold text-blue-900 dark:text-blue-300 mb-2">Subscription Features:</p>
              {editingOrg?.subscription_tier === 'free' && (
                <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                  <li>View public live scores</li>
                  <li>No team/player management</li>
                  <li>No scorekeeping access</li>
                </ul>
              )}
              {editingOrg?.subscription_tier === 'basic' && (
                <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                  <li>Manage 1 organization</li>
                  <li>Single sport only</li>
                  <li>1 scorekeeper (full control)</li>
                  <li>Basic statistics & reports</li>
                </ul>
              )}
              {editingOrg?.subscription_tier === 'premium' && (
                <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                  <li>Multiple sports support</li>
                  <li>Advanced statistics & AI insights</li>
                  <li>Live streaming integration</li>
                  <li>Multiple scorekeepers & statisticians</li>
                </ul>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSaveSubscription}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                disabled={updateSubscriptionMutation.isPending}
              >
                {updateSubscriptionMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                onClick={() => setEditingOrg(null)}
                variant="outline"
                className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                disabled={updateSubscriptionMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}