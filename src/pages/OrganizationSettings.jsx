import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Upload, Image, Save, AlertCircle, Users, Shield, UserCheck, UserCog, Palette, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import ThemeCustomizer from "@/components/ThemeCustomizer";

export default function OrganizationSettings() {
  const [user, setUser] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const queryClient = useQueryClient();

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
    const currentUser = await base44.auth.me();
    // Fetch fresh user data from DB (auth.me() may return stale token data)
    try {
      const allUsers = await base44.entities.User.list();
      const freshUser = allUsers.find(u => u.id === currentUser.id);
      if (freshUser) {
        setUser({ ...currentUser, ...freshUser });
        return;
      }
    } catch (e) {
      console.error('Failed to fetch fresh user data:', e);
    }
    setUser(currentUser);
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const currentOrgId = user?.active_organization_id || user?.organization_id;

  const { data: organization, refetch: refetchOrganization } = useQuery({
    queryKey: ['user-organization', currentOrgId],
    queryFn: async () => {
      // RLS {{user.data.organization_id}} may not resolve from the JWT token,
      // so Organization.list() returns nothing. Use service-role backend function.
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res.data?.organization || null;
    },
    enabled: !!currentOrgId,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ['org-members', currentOrgId],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.organization_id === currentOrgId || u.active_organization_id === currentOrgId);
    },
    enabled: !!currentOrgId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('Updating organization with data:', data);
      const result = await base44.entities.Organization.update(id, data);
      console.log('Update result:', result);
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['organization']);
      await queryClient.invalidateQueries(['organizations']);
      
      await refetchOrganization();
      
      setSuccessMessage("Organization updated successfully!");
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 3000);
      setLogoFile(null);
    },
    onError: (error) => {
      console.error('Update error:', error);
      setErrorMessage("Failed to update organization. Please try again.");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        tournament_name: formData.get('tournament_name') || null,
        contact_email: formData.get('contact_email'),
        contact_phone: formData.get('contact_phone') || null,
        address: formData.get('address') || null,
        settings: {
          ...(organization.settings || {}),
          include_archived_in_leaders: formData.get('include_archived_in_leaders') === 'on'
        },
        season_pin: formData.get('season_pin') || null
      };

      console.log('Form data before upload:', data);

      if (logoFile) {
        console.log('Uploading logo file:', logoFile.name);
        const uploadResult = await base44.integrations.Core.UploadFile({ file: logoFile });
        console.log('Upload result:', uploadResult);
        data.logo_url = uploadResult.file_url;
      }

      console.log('Final data to update:', data);
      await updateMutation.mutateAsync({ id: organization.id, data });
    } catch (error) {
      console.error("Error updating organization:", error);
      setErrorMessage("Error: " + (error.message || "Failed to update"));
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!currentOrgId || !organization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md text-center p-8">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-heading font-bold mb-2">No Organization Linked</h2>
            <p className="text-muted-foreground mb-4">Your account isn't linked to an organization. Please contact a super admin to assign you to one.</p>
            <Link to={createPageUrl("Dashboard")}>
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 border border-border flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-heading text-3xl font-bold tracking-tight">Organization Settings</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Update your organization details</p>
                  </div>
                </div>
              </div>

              {successMessage && (
                <Alert className="bg-primary/10 border border-primary/30">
                  <AlertDescription className="text-foreground font-medium flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              {errorMessage && (
                <Alert className="bg-destructive/10 border border-destructive/30">
                  <AlertDescription className="text-foreground font-medium flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-2xl font-heading font-bold">
                    Organization Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Logo Upload Section */}
                    <div>
                      <Label className="font-heading font-bold text-foreground text-lg mb-3 block">
                        Organization Logo
                      </Label>
                      <div className="flex items-center gap-6 bg-muted border border-border p-6">
                        <Avatar className="w-32 h-32 border border-border">
                          <AvatarImage 
                            src={logoFile ? URL.createObjectURL(logoFile) : organization.logo_url} 
                            className="object-cover"
                            key={organization.logo_url || 'no-logo'}
                          />
                          <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-4xl">
                            {organization.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              console.log('File selected:', file);
                              setLogoFile(file);
                            }}
                            className="mb-2"
                          />
                          <p className="text-sm text-muted-foreground font-medium">
                            PNG, JPG, or GIF (Max 5MB). Recommended: Square image, 512x512px
                          </p>
                          {logoFile && (
                            <Badge variant="outline" className="border-primary text-primary font-medium mt-2">
                              ✓ New logo selected: {logoFile.name}
                            </Badge>
                          )}
                          {organization.logo_url && !logoFile && (
                            <Badge variant="outline" className="border-border text-muted-foreground font-medium mt-2">
                              ✓ Current logo is set
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Organization Name */}
                    <div>
                      <Label htmlFor="name" className="font-heading font-bold text-foreground text-lg">
                        Organization Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={organization.name}
                        required
                        className="text-lg mt-2"
                      />
                    </div>

                    {/* Tournament Name */}
                    <div>
                      <Label htmlFor="tournament_name" className="font-heading font-bold text-foreground text-lg">
                        Tournament Name
                      </Label>
                      <Input
                        id="tournament_name"
                        name="tournament_name"
                        defaultValue={organization.tournament_name}
                        placeholder="e.g., Championship League 2025"
                        className="text-lg mt-2"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        Optional: The name of your league or tournament
                      </p>
                    </div>

                    {/* Contact Email */}
                    <div>
                      <Label htmlFor="contact_email" className="font-heading font-bold text-foreground">
                        Contact Email
                      </Label>
                      <Input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        defaultValue={organization.contact_email}
                        required
                        className="mt-2"
                      />
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <Label htmlFor="contact_phone" className="font-heading font-bold text-foreground">
                        Contact Phone
                      </Label>
                      <Input
                        id="contact_phone"
                        name="contact_phone"
                        type="tel"
                        defaultValue={organization.contact_phone}
                        placeholder="(555) 123-4567"
                        className="mt-2"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <Label htmlFor="address" className="font-heading font-bold text-foreground">
                        Address
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        defaultValue={organization.address}
                        placeholder="123 Main Street, City, State 12345"
                        className="mt-2"
                      />
                    </div>

                    {/* Leaderboards Settings */}
                    <div>
                      <Label className="font-heading font-bold text-foreground">Leaderboards</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="include_archived_in_leaders"
                          name="include_archived_in_leaders"
                          defaultChecked={organization?.settings?.include_archived_in_leaders === true}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor="include_archived_in_leaders" className="text-sm text-gray-700 dark:text-gray-300">
                          Include archived games in leaderboards
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        When enabled, archived completed games will count toward player leaders.
                      </p>
                    </div>

                    {/* Season Security PIN */}
                    <div className="border border-border bg-muted/30 p-6">
                      <Label htmlFor="season_pin" className="font-heading font-bold text-foreground flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-primary" />
                        Season Security PIN
                      </Label>
                      <Input
                        id="season_pin"
                        name="season_pin"
                        type="text"
                        defaultValue={organization.season_pin || ""}
                        placeholder="e.g. 1234 or season-open"
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-2 font-medium">
                        Required to open a new season in the Season Manager — prevents accidental season creation. Leave blank to remove.
                      </p>
                    </div>

                    {/* Debug Info - Remove after testing */}
                    <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 text-xs font-mono">
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Debug Info:</p>
                      <p className="text-gray-800 dark:text-gray-200">Org ID: {organization.id}</p>
                      <p className="text-gray-800 dark:text-gray-200">Current Logo: {organization.logo_url || 'None'}</p>
                      <p className="text-gray-800 dark:text-gray-200">Selected File: {logoFile?.name || 'None'}</p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                      <Button 
                        type="submit" 
                        disabled={uploading || updateMutation.isLoading}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-xl px-8"
                      >
                        {uploading || updateMutation.isLoading ? (
                          <>
                            <Upload className="w-5 h-5 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Authenticated Members Card */}
              <Card>
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-border flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="text-2xl font-heading font-bold">
                        Authenticated Members
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                      {orgMembers.length} {orgMembers.length === 1 ? 'Member' : 'Members'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {orgMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No members found</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-4">
                        {orgMembers.slice(0, 5).map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-4 bg-muted border border-border hover:border-foreground/20 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12 border border-border">
                                <AvatarFallback className="bg-secondary text-foreground font-heading font-bold">
                                  {member.full_name?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-heading font-bold text-foreground">{member.full_name}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {member.role === 'admin' && member.is_super_admin && (
                                <Badge variant="outline" className="border-primary text-primary font-medium">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Super Admin
                                </Badge>
                              )}
                              {member.role === 'admin' && !member.is_super_admin && (
                                <Badge variant="outline" className="border-foreground text-foreground font-medium">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                              {member.is_scorekeeper && (
                                <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  Scorekeeper
                                </Badge>
                              )}
                              {!member.role && !member.is_scorekeeper && (
                                <Badge variant="outline" className="font-medium">
                                  Member
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Link to={createPageUrl("OrganizationMembers")}>
                          <Button className="w-full font-medium">
                            <Users className="w-4 h-4 mr-2" />
                            Members
                          </Button>
                        </Link>
                        <Link to={createPageUrl("RolesPermissions")}>
                          <Button variant="secondary" className="w-full font-medium">
                            <UserCog className="w-4 h-4 mr-2" />
                            Roles
                          </Button>
                        </Link>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Theme Customization - Only for Org Admins */}
              {user?.role === 'admin' && (
                <ThemeCustomizer 
                  organization={organization} 
                  onUpdate={refetchOrganization}
                />
              )}

              {/* Organization Info Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 border border-border flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-heading font-bold text-foreground">Quick Info</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted p-3">
                      <span className="text-muted-foreground font-medium block mb-1">Organization ID</span>
                      <span className="text-foreground font-heading font-bold font-mono text-xs break-all">{organization.id}</span>
                    </div>
                    <div className="bg-muted p-3">
                      <span className="text-muted-foreground font-medium block mb-1">Status</span>
                      <Badge variant="outline" className={`${
                        organization.status === 'active'
                          ? 'border-primary text-primary'
                          : 'border-destructive text-destructive'
                      } font-medium`}>
                        {organization.status?.toUpperCase() || 'ACTIVE'}
                      </Badge>
                    </div>
                    <div className="bg-muted p-3">
                      <span className="text-muted-foreground font-medium block mb-1">Created</span>
                      <span className="text-foreground font-heading font-bold">
                        {new Date(organization.created_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="bg-muted p-3">
                      <span className="text-muted-foreground font-medium block mb-1">Last Updated</span>
                      <span className="text-foreground font-heading font-bold">
                        {new Date(organization.updated_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}