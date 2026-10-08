import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Shield, Home as HomeIcon, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { usePageSetup } from "@/hooks/usePageSetup";

export default function PlayerClaimReview() {
  const { user, organization, isLoading, sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode, handleLogout } = usePageSetup();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [adminNotes, setAdminNotes] = useState({});

  // Fetch pending claims
  const { data: pendingClaims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ["pending-player-claims", organization?.id],
    queryFn: async () => {
      return await base44.entities.PlayerClaim.filter({ status: "pending" }, "-created_date");
    },
    enabled: !!organization?.id,
  });

  // Fetch reviewed claims (approved/rejected)
  const { data: reviewedClaims = [] } = useQuery({
    queryKey: ["reviewed-player-claims", organization?.id],
    queryFn: async () => {
      const approved = await base44.entities.PlayerClaim.filter({ status: "approved" }, "-reviewed_date");
      const rejected = await base44.entities.PlayerClaim.filter({ status: "rejected" }, "-reviewed_date");
      return [...approved, ...rejected].sort((a, b) =>
        new Date(b.reviewed_date || b.created_date) - new Date(a.reviewed_date || a.created_date)
      );
    },
    enabled: !!organization?.id,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ claimId, action }) => {
      const res = await base44.functions.invoke("reviewPlayerClaim", {
        claim_id: claimId,
        action,
        admin_notes: adminNotes[claimId] || "",
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.action === "approve" ? "Claim approved" : "Claim rejected",
        duration: 3000,
      });
      setAdminNotes((prev) => {
        const next = { ...prev };
        delete next[variables.claimId];
        return next;
      });
      queryClient.invalidateQueries(["pending-player-claims", organization.id]);
      queryClient.invalidateQueries(["reviewed-player-claims", organization.id]);
      queryClient.invalidateQueries(["player-profiles", organization.id]);
    },
    onError: (err) => {
      toast({ title: "Review failed", description: err.message, variant: "destructive", duration: 4000 });
    },
  });

  if (!user || isLoading) {
    return (
      <div className="arena-command min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="arena-command min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="font-heading text-2xl font-bold mb-3">No Organization Found</h2>
          <Button onClick={() => navigate(createPageUrl("Home"))}>
            <HomeIcon className="w-4 h-4 mr-2" /> Go Home
          </Button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.role === "admin" && user?.is_super_admin === true;
  const isAdmin = user?.role === "admin";
  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="arena-command min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading text-2xl font-bold mb-3">Admin Access Required</h2>
          <p className="text-muted-foreground text-sm mb-6">Only league admins can review player claims.</p>
          <Button onClick={() => navigate(createPageUrl("Home"))}>
            <HomeIcon className="w-4 h-4 mr-2" /> Go Home
          </Button>
        </div>
      </div>
    );
  }

  const renderClaim = (claim, isPending) => (
    <Card key={claim.id} className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-heading font-bold text-sm">
              {claim.player_name}
              <span className="text-muted-foreground ml-2 font-normal">#{claim.team_name || "No team"}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Claimed by {claim.user_name} ({claim.user_email})
            </p>
          </div>
          <Badge variant={isPending ? "outline" : claim.status === "approved" ? "default" : "destructive"}>
            {claim.status}
          </Badge>
        </div>

        {claim.reason && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            <span className="font-medium text-foreground">Reason: </span>
            {claim.reason}
          </div>
        )}

        {isPending ? (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Admin Notes (optional)</label>
              <Textarea
                placeholder="Add notes for the player..."
                value={adminNotes[claim.id] || ""}
                onChange={(e) => setAdminNotes((prev) => ({ ...prev, [claim.id]: e.target.value }))}
                className="min-h-[60px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => reviewMutation.mutate({ claimId: claim.id, action: "reject" })}
                disabled={reviewMutation.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => reviewMutation.mutate({ claimId: claim.id, action: "approve" })}
                disabled={reviewMutation.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            Reviewed by {claim.reviewed_by} on {new Date(claim.reviewed_date).toLocaleDateString()}
            {claim.admin_notes && <span className="block mt-1">Notes: {claim.admin_notes}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="arena-command min-h-screen bg-background text-foreground">
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
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h1 className="font-heading text-3xl font-bold tracking-tight">Player Claim Review</h1>
                <p className="text-muted-foreground mt-1 text-sm">Review and approve roster claim requests from players.</p>
              </div>

              <Tabs defaultValue="pending">
                <TabsList>
                  <TabsTrigger value="pending">
                    <Clock className="w-4 h-4 mr-2" />
                    Pending ({pendingClaims.length})
                  </TabsTrigger>
                  <TabsTrigger value="reviewed">
                    Reviewed ({reviewedClaims.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6 space-y-4">
                  {claimsLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  ) : pendingClaims.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-muted-foreground text-sm">No pending claims.</p>
                    </div>
                  ) : (
                    pendingClaims.map((claim) => renderClaim(claim, true))
                  )}
                </TabsContent>

                <TabsContent value="reviewed" className="mt-6 space-y-4">
                  {reviewedClaims.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-muted-foreground text-sm">No reviewed claims yet.</p>
                    </div>
                  ) : (
                    reviewedClaims.map((claim) => renderClaim(claim, false))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}