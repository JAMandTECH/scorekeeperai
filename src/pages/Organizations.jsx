import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Building2, Mail, Phone, MapPin, Edit, Upload, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { createPageUrl } from "@/utils";

export default function Organizations() {
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
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
    const currentUser = await base44.auth.me();
    setUser(currentUser);
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
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Organization.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizations']);
      setShowForm(false);
      setEditingOrg(null);
      setLogoFile(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Organization.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizations']);
      setShowForm(false);
      setEditingOrg(null);
      setLogoFile(null);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        contact_email: formData.get('contact_email'),
        contact_phone: formData.get('contact_phone'),
        address: formData.get('address'),
        status: formData.get('status') || 'active',
      };

      if (logoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: logoFile });
        data.logo_url = file_url;
      }

      if (editingOrg) {
        updateMutation.mutate({ id: editingOrg.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setLogoFile(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50 dark:from-gray-900 dark:via-purple-950/10 dark:to-gray-900">
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
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">Organizations</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Manage all registered organizations</p>
                </div>
                <Button 
                  onClick={() => {
                    setEditingOrg(null);
                    setLogoFile(null);
                    setShowForm(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Organization
                </Button>
              </div>

              {/* Organizations Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map((org) => (
                  <Card key={org.id} className="relative overflow-hidden border-2 border-purple-100 dark:border-purple-900 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 shadow-lg hover:shadow-2xl transition-all group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl"></div>
                    <CardHeader className="relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="w-16 h-16 border-4 border-white dark:border-gray-700 shadow-xl">
                            <AvatarImage src={org.logo_url} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white font-black text-lg">
                              {org.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-black text-gray-900 dark:text-white truncate">{org.name}</CardTitle>
                            <Badge 
                              variant={org.status === 'active' ? 'default' : 'secondary'} 
                              className={`mt-1 font-bold ${
                                org.status === 'active' 
                                  ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800' 
                                  : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                              }`}
                            >
                              {org.status}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEdit(org)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 relative z-10">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate font-medium">{org.contact_email}</span>
                      </div>
                      {org.contact_phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium">{org.contact_phone}</span>
                        </div>
                      )}
                      {org.address && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate font-medium">{org.address}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {organizations.length === 0 && !isLoading && (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-800 dark:to-purple-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Building2 className="w-12 h-12 text-purple-600 dark:text-purple-300" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No organizations yet</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Add your first organization to get started</p>
                </div>
              )}

              {/* Dialog */}
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">{editingOrg ? 'Edit Organization' : 'Add New Organization'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="font-bold text-gray-700 dark:text-gray-300">Organization Logo</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <Avatar className="w-20 h-20 border-4 border-gray-200 dark:border-gray-600">
                          <AvatarImage src={logoFile ? URL.createObjectURL(logoFile) : editingOrg?.logo_url} />
                          <AvatarFallback className="bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700">
                            <Image className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setLogoFile(e.target.files[0])}
                            className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG, or GIF (Max 5MB)</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="name" className="font-bold text-gray-700 dark:text-gray-300">Organization Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingOrg?.name}
                        required
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_email" className="font-bold text-gray-700 dark:text-gray-300">Contact Email</Label>
                      <Input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        defaultValue={editingOrg?.contact_email}
                        required
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_phone" className="font-bold text-gray-700 dark:text-gray-300">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        name="contact_phone"
                        defaultValue={editingOrg?.contact_phone}
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address" className="font-bold text-gray-700 dark:text-gray-300">Address</Label>
                      <Input
                        id="address"
                        name="address"
                        defaultValue={editingOrg?.address}
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={uploading} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold">
                        {uploading ? (
                          <>
                            <Upload className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          editingOrg ? 'Update' : 'Create'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}