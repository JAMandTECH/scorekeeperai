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
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                <h1 className="font-heading text-3xl font-bold tracking-tight">
                  Join an Organization
                </h1>
                <p className="text-muted-foreground mt-2 font-medium">
                   Browse and request to join sports organizations
                 </p>
                </div>

                {/* My Requests Section */}
                {myRequests.length > 0 && (
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-xl font-heading font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      My Join Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {myRequests.map(request => (
                        <div key={request.id} className="flex items-center justify-between p-4 bg-muted border border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 border border-border flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-foreground" />
                            </div>
                            <div>
                              <p className="font-heading font-bold text-foreground">{request.organization_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Requested as: <span className="capitalize">{request.requested_role_in_org}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={
                              request.status === 'pending' ? 'border-foreground/60 text-foreground' :
                              request.status === 'approved' ? 'border-primary text-primary' :
                              'border-destructive text-destructive'
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
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-lg border border-border"
                />
                </div>

                {/* Organizations Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrgs.map(org => {
                  const status = getMembershipStatus(org.id);
                  const isCurrentOrg = org.id === user?.organization_id || org.id === user?.active_organization_id;

                  return (
                    <Card key={org.id} className="relative overflow-hidden hover:border-foreground/20 transition-colors">
                      {isCurrentOrg && (
                        <div className="absolute top-3 right-3">
                          <Badge className="font-medium">
                            Current
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-14 h-14 border border-border">
                            <AvatarImage src={org.logo_url} />
                            <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                              {org.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-heading font-bold truncate">
                              {org.name}
                            </CardTitle>
                            {org.tournament_name && (
                              <p className="text-sm text-muted-foreground truncate">
                                {org.tournament_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Trophy className="w-4 h-4" />
                            <span>Sports League</span>
                          </div>
                        </div>

                        {status?.type === 'member' ? (
                          <Badge variant="outline" className="w-full justify-center py-2 border-primary text-primary">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Member ({status.data.role_in_org})
                          </Badge>
                        ) : status?.type === 'request' ? (
                          <Badge variant="outline" className={`w-full justify-center py-2 ${
                            status.data.status === 'pending' ? 'border-foreground/60 text-foreground' :
                            status.data.status === 'rejected' ? 'border-destructive text-destructive' :
                            'border-primary text-primary'
                          }`}>
                            {status.data.status === 'pending' && <Clock className="w-4 h-4 mr-2" />}
                            {status.data.status === 'rejected' && <XCircle className="w-4 h-4 mr-2" />}
                            {status.data.status === 'approved' && <CheckCircle className="w-4 h-4 mr-2" />}
                            Request {status.data.status}
                          </Badge>
                        ) : isCurrentOrg ? (
                          <Badge variant="outline" className="w-full justify-center py-2 border-border text-muted-foreground">
                            <Building2 className="w-4 h-4 mr-2" />
                            Your Primary Organization
                          </Badge>
                        ) : (
                          <Button 
                            className="w-full font-medium"
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
                  <div className="w-20 h-20 bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-heading font-bold mb-2">No Organizations Found</h3>
                  <p className="text-muted-foreground">
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
            <DialogTitle className="text-xl font-heading font-bold">Request to Join</DialogTitle>
          </DialogHeader>
          
          {selectedOrg && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted border border-border">
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarImage src={selectedOrg.logo_url} />
                  <AvatarFallback className="bg-secondary text-foreground font-heading font-bold">
                    {selectedOrg.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-heading font-bold text-foreground">{selectedOrg.name}</p>
                  {selectedOrg.tournament_name && (
                    <p className="text-sm text-muted-foreground">{selectedOrg.tournament_name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-heading font-bold text-foreground">
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
                <label className="text-sm font-heading font-bold text-foreground">
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
              className="font-medium"
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