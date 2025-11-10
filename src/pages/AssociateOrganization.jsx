import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, CheckCircle, Plus, ArrowRight, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AssociateOrganization() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      console.log("AssociateOrganization: User loaded", currentUser);
      
      // If user already completed onboarding, redirect to home
      if (currentUser.onboarding_completed === true) {
        console.log("AssociateOrganization: User already completed onboarding");
        navigate(createPageUrl("Home"));
        return;
      }
      
      setUser(currentUser);
    } catch (error) {
      console.error("AssociateOrganization: Error loading user", error);
      base44.auth.redirectToLogin(createPageUrl("AssociateOrganization"));
    }
    setLoading(false);
  };

  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: !!user,
  });

  const filteredOrganizations = allOrganizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOrganization = (org) => {
    setSelectedOrgs(prev => {
      const exists = prev.find(o => o.id === org.id);
      if (exists) {
        return prev.filter(o => o.id !== org.id);
      } else {
        return [...prev, org];
      }
    });
  };

  const associateMutation = useMutation({
    mutationFn: async ({ organizationIds, activeOrgId }) => {
      console.log("Creating UserOrganization records for:", organizationIds);
      
      // Create UserOrganization records for each selected organization
      const promises = organizationIds.map(orgId =>
        base44.entities.UserOrganization.create({
          user_id: user.id,
          user_email: user.email,
          organization_id: orgId,
          role_in_org: 'fan',
          status: 'active',
        })
      );
      
      await Promise.all(promises);
      console.log("UserOrganization records created");
      
      // Update user profile with active organization and mark onboarding complete
      console.log("Updating user with active_organization_id:", activeOrgId);
      await base44.auth.updateMe({
        active_organization_id: activeOrgId,
        onboarding_completed: true,
      });
      console.log("User updated successfully");
      
      return true;
    },
    onSuccess: () => {
      console.log("Association successful, redirecting to Home");
      navigate(createPageUrl("Home"));
    },
    onError: (error) => {
      console.error("Association failed:", error);
      alert(`Failed to associate with organizations: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (selectedOrgs.length === 0) {
      alert("Please select at least one organization");
      return;
    }
    
    // Use the first selected org as the active one by default
    const activeOrgId = selectedOrgs[0].id;
    const organizationIds = selectedOrgs.map(org => org.id);
    
    associateMutation.mutate({ organizationIds, activeOrgId });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full border-2 border-blue-200 dark:border-blue-800 shadow-2xl">
        <CardHeader className="border-b-2 border-blue-100 dark:border-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl font-black text-gray-900 dark:text-white">
                Choose Your Organizations
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
                Select one or more organizations to follow and view their content
              </p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for organizations by name..."
              className="pl-10 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium text-base py-6"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Selected Organizations Summary */}
          {selectedOrgs.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-bold text-green-900 dark:text-green-300">
                    {selectedOrgs.length} Organization{selectedOrgs.length !== 1 ? 's' : ''} Selected
                  </p>
                </div>
                <Button
                  onClick={() => setSelectedOrgs([])}
                  variant="ghost"
                  size="sm"
                  className="text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 font-bold"
                >
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedOrgs.map(org => (
                  <Badge 
                    key={org.id} 
                    className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold px-3 py-1.5 text-sm"
                  >
                    {org.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Organizations List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {filteredOrganizations.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg font-bold">
                  {searchQuery ? 'No organizations found' : 'No organizations available'}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  {searchQuery ? 'Try a different search term' : 'Organizations will appear here once they are created'}
                </p>
              </div>
            ) : (
              filteredOrganizations.map(org => {
                const isSelected = selectedOrgs.find(o => o.id === org.id);
                return (
                  <Card 
                    key={org.id}
                    className={`relative overflow-hidden cursor-pointer transition-all border-2 ${
                      isSelected 
                        ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30 shadow-lg' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                    }`}
                    onClick={() => toggleOrganization(org)}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16 border-4 border-white dark:border-gray-700 shadow-lg">
                          <AvatarImage src={org.logo_url} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-lg">
                            {org.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-black text-gray-900 dark:text-white truncate">
                            {org.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            {org.contact_email}
                          </p>
                          {org.address && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              📍 {org.address}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOrganization(org);
                          }}
                          className={`${
                            isSelected 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                          } font-bold`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Selected
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Select
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Submit Button */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleSubmit}
              disabled={selectedOrgs.length === 0 || associateMutation.isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg py-6 font-black shadow-xl"
            >
              {associateMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  Completing Registration...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  Continue with {selectedOrgs.length} Organization{selectedOrgs.length !== 1 ? 's' : ''}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            {selectedOrgs.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
                Please select at least one organization to continue
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}