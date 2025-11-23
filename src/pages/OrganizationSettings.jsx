import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Upload, Image, Save, AlertCircle, Users, Shield, UserCheck, UserCog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";

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
    setUser(currentUser);
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: organization, refetch: refetchOrganization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === user?.organization_id);
    },
    enabled: !!user?.organization_id,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ['org-members', user?.organization_id],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.organization_id === user?.organization_id || u.active_organization_id === user?.organization_id);
    },
    enabled: !!user?.organization_id,
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
        tournament_name: formData.get('tournament_name') || null, // New field added here
        contact_email: formData.get('contact_email'),
        contact_phone: formData.get('contact_phone') || null,
        address: formData.get('address') || null,
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

  if (!organization || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50 dark:from-gray-900 dark:via-purple-950/10 dark:to-gray-900">
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
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white">Organization Settings</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">Update your organization details</p>
                  </div>
                </div>
              </div>

              {successMessage && (
                <Alert className="bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800">
                  <AlertDescription className="text-green-800 dark:text-green-300 font-bold flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              {errorMessage && (
                <Alert className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800">
                  <AlertDescription className="text-red-800 dark:text-red-300 font-bold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
                <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-800">
                  <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
                    Organization Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Logo Upload Section */}
                    <div>
                      <Label className="font-bold text-gray-700 dark:text-gray-300 text-lg mb-3 block">
                        Organization Logo
                      </Label>
                      <div className="flex items-center gap-6 bg-gradient-to-br from-gray-50 to-purple-50/30 dark:from-gray-900 dark:to-purple-950/20 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700">
                        <Avatar className="w-32 h-32 border-4 border-white dark:border-gray-600 shadow-2xl">
                          <AvatarImage 
                            src={logoFile ? URL.createObjectURL(logoFile) : organization.logo_url} 
                            className="object-cover"
                            key={organization.logo_url || 'no-logo'}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-4xl">
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
                            className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium mb-2"
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            PNG, JPG, or GIF (Max 5MB). Recommended: Square image, 512x512px
                          </p>
                          {logoFile && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold mt-2">
                              ✓ New logo selected: {logoFile.name}
                            </Badge>
                          )}
                          {organization.logo_url && !logoFile && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold mt-2">
                              ✓ Current logo is set
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Organization Name */}
                    <div>
                      <Label htmlFor="name" className="font-bold text-gray-700 dark:text-gray-300 text-lg">
                        Organization Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={organization.name}
                        required
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium text-lg mt-2"
                      />
                    </div>

                    {/* Tournament Name */}
                    <div>
                      <Label htmlFor="tournament_name" className="font-bold text-gray-700 dark:text-gray-300 text-lg">
                        Tournament Name
                      </Label>
                      <Input
                        id="tournament_name"
                        name="tournament_name"
                        defaultValue={organization.tournament_name}
                        placeholder="e.g., Championship League 2025"
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium text-lg mt-2"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        Optional: The name of your league or tournament
                      </p>
                    </div>

                    {/* Contact Email */}
                    <div>
                      <Label htmlFor="contact_email" className="font-bold text-gray-700 dark:text-gray-300">
                        Contact Email
                      </Label>
                      <Input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        defaultValue={organization.contact_email}
                        required
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium mt-2"
                      />
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <Label htmlFor="contact_phone" className="font-bold text-gray-700 dark:text-gray-300">
                        Contact Phone
                      </Label>
                      <Input
                        id="contact_phone"
                        name="contact_phone"
                        type="tel"
                        defaultValue={organization.contact_phone}
                        placeholder="(555) 123-4567"
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium mt-2"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <Label htmlFor="address" className="font-bold text-gray-700 dark:text-gray-300">
                        Address
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        defaultValue={organization.address}
                        placeholder="123 Main Street, City, State 12345"
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium mt-2"
                      />
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
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
                <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
                        Authenticated Members
                      </CardTitle>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold">
                      {orgMembers.length} {orgMembers.length === 1 ? 'Member' : 'Members'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {orgMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No members found</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-4">
                        {orgMembers.slice(0, 5).map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-600 shadow-md">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                                  {member.full_name?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white">{member.full_name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {member.role === 'admin' && member.is_super_admin && (
                                <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 font-bold">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Super Admin
                                </Badge>
                              )}
                              {member.role === 'admin' && !member.is_super_admin && (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 font-bold">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                              {member.is_scorekeeper && (
                                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold">
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  Scorekeeper
                                </Badge>
                              )}
                              {!member.role && !member.is_scorekeeper && (
                                <Badge variant="outline" className="font-bold">
                                  Member
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Link to={createPageUrl("OrganizationMembers")}>
                          <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg">
                            <Users className="w-4 h-4 mr-2" />
                            Members
                          </Button>
                        </Link>
                        <Link to={createPageUrl("RolesPermissions")}>
                          <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg">
                            <UserCog className="w-4 h-4 mr-2" />
                            Roles
                          </Button>
                        </Link>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Organization Info Card */}
              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-2 border-purple-200 dark:border-purple-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Quick Info</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg p-3">
                      <span className="text-gray-500 dark:text-gray-400 font-semibold block mb-1">Organization ID</span>
                      <span className="text-gray-900 dark:text-white font-bold font-mono text-xs break-all">{organization.id}</span>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg p-3">
                      <span className="text-gray-500 dark:text-gray-400 font-semibold block mb-1">Status</span>
                      <Badge className={`${
                        organization.status === 'active'
                          ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
                          : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                      } font-bold`}>
                        {organization.status?.toUpperCase() || 'ACTIVE'}
                      </Badge>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg p-3">
                      <span className="text-gray-500 dark:text-gray-400 font-semibold block mb-1">Created</span>
                      <span className="text-gray-900 dark:text-white font-bold">
                        {new Date(organization.created_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg p-3">
                      <span className="text-gray-500 dark:text-gray-400 font-semibold block mb-1">Last Updated</span>
                      <span className="text-gray-900 dark:text-white font-bold">
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