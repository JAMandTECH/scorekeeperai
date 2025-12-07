import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Building2, Users, Send, Clock, CheckCircle, XCircle, Trophy } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function JoinOrganization() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestRole, setRequestRole] = useState("fan");
  const [requestMessage, setRequestMessage] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("JoinOrganization"));
    } finally {
      setLoading(false);
    }
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

  // Fetch all organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ['all-organizations-join'],
    queryFn: () => base44.entities.Organization.filter({ status: 'active' }),
    enabled: !!user,
  });

  // Fetch user's existing memberships
  const { data: userMemberships = [] } = useQuery({
    queryKey: ['user-memberships', user?.id],
    queryFn: () => base44.entities.UserOrganization.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  // Fetch user's pending requests
  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-join-requests', user?.id],
    queryFn: () => base44.entities.OrganizationJoinRequest.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  // Fetch current organization for header
  const { data: currentOrganization } = useQuery({
    queryKey: ['current-org', user?.organization_id || user?.active_organization_id],
    queryFn: async () => {
      const orgId = user?.organization_id || user?.active_organization_id;
      if (!orgId) return null;
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === orgId);
    },
    enabled: !!(user?.organization_id || user?.active_organization_id),
  });

  // Submit join request mutation
  const submitRequestMutation = useMutation({
    mutationFn: async (data) => {
      const request = await base44.entities.OrganizationJoinRequest.create(data);
      
      // Create notification for organization admins
      await base44.entities.Notification.create({
        organization_id: data.organization_id,
        type: 'join_request',
        title: 'New Join Request',
        message: `${data.user_name || data.user_email} wants to join as a ${data.requested_role_in_org}`,
        data: {
          request_id: request.id,
          user_name: data.user_name,
          user_email: data.user_email,
          role: data.requested_role_in_org
        }
      });

      // Send email notification to organization admins
      try {
        const orgUsers = await base44.entities.User.filter({ 
          organization_id: data.organization_id, 
          role: 'admin' 
        });
        
        for (const admin of orgUsers) {
          await base44.integrations.Core.SendEmail({
            to: admin.email,
            subject: `New Organization Join Request`,
            body: `
              <h2>New Join Request</h2>
              <p>A user has requested to join your organization:</p>
              <ul>
                <li><strong>Name:</strong> ${data.user_name || 'N/A'}</li>
                <li><strong>Email:</strong> ${data.user_email}</li>
                <li><strong>Requested Role:</strong> ${data.requested_role_in_org}</li>
                <li><strong>Organization:</strong> ${data.organization_name}</li>
                ${data.message ? `<li><strong>Message:</strong> ${data.message}</li>` : ''}
              </ul>
              <p>Please review this request in the Join Requests section of your admin dashboard.</p>
            `
          });
        }
      } catch (emailError) {
        console.error('Failed to send email notifications:', emailError);
      }
      
      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-join-requests'] });
      setShowRequestDialog(false);
      setSelectedOrg(null);
      setRequestRole("fan");
      setRequestMessage("");
    },
  });

  // Cancel request mutation
  const cancelRequestMutation = useMutation({
    mutationFn: (requestId) => base44.entities.OrganizationJoinRequest.delete(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-join-requests'] });
    },
  });

  const handleSubmitRequest = () => {
    if (!selectedOrg || !user) return;
    
    submitRequestMutation.mutate({
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      organization_id: selectedOrg.id,
      organization_name: selectedOrg.name,
      requested_role_in_org: requestRole,
      message: requestMessage,
      status: "pending"
    });
  };

  const openRequestDialog = (org) => {
    setSelectedOrg(org);
    setShowRequestDialog(true);
  };

  // Filter organizations based on search
  const filteredOrgs = organizations.filter(org => 
    org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.tournament_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if user is already a member or has pending request for an org
  const getMembershipStatus = (orgId) => {
    const membership = userMemberships.find(m => m.organization_id === orgId);
    if (membership) return { type: 'member', data: membership };
    
    const request = myRequests.find(r => r.organization_id === orgId);
    if (request) return { type: 'request', data: request };
    
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900">
      <AdminHeader 
        user={user}
        organization={currentOrganization}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex">
        <AdminSidebar 
          user={user}
          organization={currentOrganization}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Header */}
              <div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">
                  Join an Organization
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Browse and request to join sports organizations
                </p>
              </div>

              {/* My Requests Section */}
              {myRequests.length > 0 && (
                <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                  <CardHeader>
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      My Join Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {myRequests.map(request => (
                        <div key={request.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{request.organization_name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Requested as: <span className="capitalize">{request.requested_role_in_org}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                              request.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' :
                              'bg-red-100 text-red-700 border-red-300'
                            }>
                              {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                              {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                            {request.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => cancelRequestMutation.mutate(request.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700"
                />
              </div>

              {/* Organizations Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrgs.map(org => {
                  const status = getMembershipStatus(org.id);
                  const isCurrentOrg = org.id === user?.organization_id || org.id === user?.active_organization_id;
                  
                  return (
                    <Card key={org.id} className="relative overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 card-hover">
                      {isCurrentOrg && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                            Current
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-14 h-14 border-2 border-white dark:border-gray-700 shadow-lg">
                            <AvatarImage src={org.logo_url} />
                            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-lg">
                              {org.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-black text-gray-900 dark:text-white truncate">
                              {org.name}
                            </CardTitle>
                            {org.tournament_name && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {org.tournament_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <div className="flex items-center gap-1">
                            <Trophy className="w-4 h-4" />
                            <span>Sports League</span>
                          </div>
                        </div>

                        {status?.type === 'member' ? (
                          <Badge className="w-full justify-center py-2 bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Member ({status.data.role_in_org})
                          </Badge>
                        ) : status?.type === 'request' ? (
                          <Badge className={`w-full justify-center py-2 ${
                            status.data.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                            status.data.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-300' :
                            'bg-green-100 text-green-700 border-green-300'
                          }`}>
                            {status.data.status === 'pending' && <Clock className="w-4 h-4 mr-2" />}
                            {status.data.status === 'rejected' && <XCircle className="w-4 h-4 mr-2" />}
                            {status.data.status === 'approved' && <CheckCircle className="w-4 h-4 mr-2" />}
                            Request {status.data.status}
                          </Badge>
                        ) : isCurrentOrg ? (
                          <Badge className="w-full justify-center py-2 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
                            <Building2 className="w-4 h-4 mr-2" />
                            Your Primary Organization
                          </Badge>
                        ) : (
                          <Button 
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold"
                            onClick={() => openRequestDialog(org)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Request to Join
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredOrgs.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Organizations Found</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? "Try adjusting your search query" : "No active organizations available"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Request to Join</DialogTitle>
          </DialogHeader>
          
          {selectedOrg && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-lg">
                  <AvatarImage src={selectedOrg.logo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black">
                    {selectedOrg.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedOrg.name}</p>
                  {selectedOrg.tournament_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedOrg.tournament_name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Request Role
                </label>
                <Select value={requestRole} onValueChange={setRequestRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fan">Fan - Follow games and stats</SelectItem>
                    <SelectItem value="member">Member - Participate in organization</SelectItem>
                    <SelectItem value="player">Player - Registered player</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Message (Optional)
                </label>
                <Textarea
                  placeholder="Tell the organization why you want to join..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold"
              onClick={handleSubmitRequest}
              disabled={submitRequestMutation.isPending}
            >
              {submitRequestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}