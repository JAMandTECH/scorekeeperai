import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Check, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OrganizationSwitcher({ user, currentOrganization, onSwitch }) {
  const queryClient = useQueryClient();

  // Fetch user's organization memberships
  const { data: memberships = [] } = useQuery({
    queryKey: ['user-memberships', user?.id],
    queryFn: () => base44.entities.UserOrganization.filter({ user_id: user?.id, status: 'active' }),
    enabled: !!user?.id,
  });

  // Fetch all organizations for the memberships
  const { data: organizations = [] } = useQuery({
    queryKey: ['membership-organizations', memberships.map(m => m.organization_id)],
    queryFn: async () => {
      if (memberships.length === 0) return [];
      const allOrgs = await base44.entities.Organization.list();
      const orgIds = memberships.map(m => m.organization_id);
      // Include current org if not in memberships
      if (user?.organization_id && !orgIds.includes(user.organization_id)) {
        orgIds.push(user.organization_id);
      }
      return allOrgs.filter(org => orgIds.includes(org.id));
    },
    enabled: memberships.length > 0 || !!user?.organization_id,
  });

  // Switch organization mutation
  const switchOrgMutation = useMutation({
    mutationFn: async (orgId) => {
      await base44.auth.updateMe({ active_organization_id: orgId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      if (onSwitch) onSwitch();
      window.location.reload(); // Reload to refresh all org-specific data
    },
  });

  const handleSwitchOrg = (orgId) => {
    if (orgId === currentOrganization?.id) return;
    switchOrgMutation.mutate(orgId);
  };

  // Get membership role for an org
  const getMembershipRole = (orgId) => {
    if (orgId === user?.organization_id) return 'admin';
    const membership = memberships.find(m => m.organization_id === orgId);
    return membership?.role_in_org || 'member';
  };

  // Don't show if user has no memberships and no primary org
  if (organizations.length === 0 && !user?.organization_id) {
    return null;
  }

  // Only show dropdown if user has multiple organizations
  const hasMultipleOrgs = organizations.length > 1 || (organizations.length === 1 && user?.organization_id && organizations[0]?.id !== user?.organization_id);

  if (!hasMultipleOrgs && organizations.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-3 py-2 h-auto hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
        >
          <Avatar className="w-8 h-8 border-2 border-white dark:border-gray-700 shadow-sm">
            <AvatarImage src={currentOrganization?.logo_url} />
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold">
              {currentOrganization?.name?.substring(0, 2).toUpperCase() || 'ORG'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px]">
              {currentOrganization?.name || 'Select Org'}
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider">
          Your Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {organizations.map(org => {
          const isActive = org.id === currentOrganization?.id || org.id === user?.active_organization_id;
          const role = getMembershipRole(org.id);
          
          return (
            <DropdownMenuItem
              key={org.id}
              className={`flex items-center gap-3 p-3 cursor-pointer ${isActive ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
              onClick={() => handleSwitchOrg(org.id)}
              disabled={switchOrgMutation.isPending}
            >
              <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-sm">
                <AvatarImage src={org.logo_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs font-bold">
                  {org.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {org.name}
                </p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                  {role}
                </Badge>
              </div>
              {isActive && (
                <Check className="w-4 h-4 text-blue-600" />
              )}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        <Link to={createPageUrl("JoinOrganization")}>
          <DropdownMenuItem className="flex items-center gap-2 text-blue-600 dark:text-blue-400 cursor-pointer">
            <Plus className="w-4 h-4" />
            <span className="font-semibold">Join Another Organization</span>
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}