import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle, Plus, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function OrganizationSelector() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      console.log("OrganizationSelector: User loaded", currentUser);
      setUser(currentUser);
    } catch (error) {
      console.error("OrganizationSelector: Error loading user", error);
      base44.auth.redirectToLogin(createPageUrl("OrganizationSelector"));
    }
    setLoading(false);
  };

  const { data: userOrganizations = [] } = useQuery({
    queryKey: ['userOrganizations', user?.id],
    queryFn: () => base44.entities.UserOrganization.filter({ 
      user_id: user?.id,
      status: 'active',
    }),
    enabled: !!user?.id,
  });

  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: !!user,
  });

  const selectMutation = useMutation({
    mutationFn: async (organizationId) => {
      console.log("Setting active_organization_id to:", organizationId);
      await base44.auth.updateMe({
        active_organization_id: organizationId,
      });
      return organizationId;
    },
    onSuccess: () => {
      console.log("Organization selected, redirecting to Home");
      navigate(createPageUrl("Home"));
    },
    onError: (error) => {
      console.error("Failed to select organization:", error);
      alert(`Failed to select organization: ${error.message}`);
    },
  });

  const handleSelect = (orgId) => {
    selectMutation.mutate(orgId);
  };

  const handleAddMore = () => {
    navigate(createPageUrl("AssociateOrganization"));
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

  const myOrganizations = allOrganizations.filter(org => 
    userOrganizations.some(uo => uo.organization_id === org.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full border-2 border-blue-200 dark:border-blue-800 shadow-2xl">
        <CardHeader className="border-b-2 border-blue-100 dark:border-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl font-black text-gray-900 dark:text-white">
                Select Organization
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
                Choose which organization you want to view
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {user?.active_organization_id && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-900 dark:text-blue-300 font-bold">
                💡 You're currently viewing: <strong>{allOrganizations.find(o => o.id === user.active_organization_id)?.name || 'Unknown'}</strong>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Select a different organization below to switch
              </p>
            </div>
          )}

          {myOrganizations.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg font-bold mb-2">
                No Organizations Found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                You haven't associated with any organizations yet
              </p>
              <Button
                onClick={handleAddMore}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Find Organizations
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {myOrganizations.map(org => {
                  const isActive = user?.active_organization_id === org.id;
                  return (
                    <Card 
                      key={org.id}
                      className={`relative overflow-hidden cursor-pointer transition-all border-2 ${
                        isActive 
                          ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-950/30 shadow-lg' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                      }`}
                      onClick={() => !isActive && handleSelect(org.id)}
                    >
                      {isActive && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-20 h-20 border-4 border-white dark:border-gray-700 shadow-xl">
                            <AvatarImage src={org.logo_url} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-xl">
                              {org.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white truncate">
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
                          {!isActive && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(org.id);
                              }}
                              disabled={selectMutation.isLoading}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                            >
                              {selectMutation.isLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              ) : (
                                <>
                                  Select
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Add More Organizations Button */}
              <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleAddMore}
                  variant="outline"
                  className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-base py-6"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add More Organizations
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}