import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Mail, Phone, Shield, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Profile() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

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

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      loadUser();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      full_name: formData.get("full_name"),
      phone: formData.get("phone"),
    };

    updateProfileMutation.mutate(data);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const isSuperAdmin = user?.user_type === "super_admin";

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
          <p className="text-slate-600 mt-1">Manage your account information</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-4 pb-6 border-b">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center">
                    {isSuperAdmin ? (
                      <Shield className="w-10 h-10 text-white" />
                    ) : (
                      <UserCircle className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {user?.full_name || "User"}
                    </p>
                    <Badge
                      className={`mt-2 ${
                        isSuperAdmin
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {user?.user_type?.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      defaultValue={user?.full_name}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <Input
                        id="email"
                        name="email"
                        value={user?.email}
                        disabled
                        className="bg-slate-50"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Email cannot be changed
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <Input
                        id="phone"
                        name="phone"
                        defaultValue={user?.phone}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600"
                    disabled={updateProfileMutation.isLoading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <div>
                    <p className="font-medium text-slate-900">User Type</p>
                    <p className="text-sm text-slate-600">Your access level</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      isSuperAdmin
                        ? "border-purple-300 text-purple-700"
                        : "border-blue-300 text-blue-700"
                    }
                  >
                    {user?.user_type?.replace("_", " ")}
                  </Badge>
                </div>

                {user?.organization_id && (
                  <div className="flex justify-between items-center py-3 border-b">
                    <div>
                      <p className="font-medium text-slate-900">Organization</p>
                      <p className="text-sm text-slate-600">Your organization ID</p>
                    </div>
                    <p className="text-sm font-mono text-slate-600">
                      {user.organization_id}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 border-b">
                  <div>
                    <p className="font-medium text-slate-900">Account Created</p>
                    <p className="text-sm text-slate-600">Member since</p>
                  </div>
                  <p className="text-sm text-slate-600">
                    {user?.created_date
                      ? new Date(user.created_date).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>

                <div className="flex justify-between items-center py-3">
                  <div>
                    <p className="font-medium text-slate-900">User Role</p>
                    <p className="text-sm text-slate-600">System role</p>
                  </div>
                  <Badge>{user?.role || "user"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}