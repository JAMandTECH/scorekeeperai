import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, AlertTriangle, Calendar } from "lucide-react";
import { useSubscription } from "@/components/hooks/useSubscription";

export default function SubscriptionBanner({ organization }) {
  const subscription = useSubscription(organization);

  // Don't show banner if subscription is active
  if (subscription.isActive && !subscription.isTrialExpired) {
    return null;
  }

  // Trial expiring soon (less than 7 days)
  if (subscription.status === 'trial' && organization?.trial_end_date) {
    const daysLeft = Math.ceil((new Date(organization.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 7) {
      return null; // Don't show if trial has more than 7 days
    }

    return (
      <Alert className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 mb-6">
        <Calendar className="w-4 h-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-orange-900 dark:text-orange-300">
            <strong>Trial ending soon!</strong> Your trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. 
            Subscribe to continue using premium features.
          </span>
          <Link to={createPageUrl("SubscriptionCheckout")}>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white font-bold ml-4">
              Subscribe Now
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial expired or subscription expired
  if (subscription.isTrialExpired || subscription.status === 'expired') {
    return (
      <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 mb-6">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-red-900 dark:text-red-300">
            <strong>Subscription expired!</strong> Subscribe now to restore access to premium features.
          </span>
          <Link to={createPageUrl("SubscriptionCheckout")}>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold ml-4">
              Renew Now
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Free tier
  if (subscription.tier === 'free') {
    return (
      <Alert className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 mb-6">
        <Crown className="w-4 h-4 text-purple-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-purple-900 dark:text-purple-300">
            <strong>Upgrade to unlock premium features!</strong> Manage teams, schedule games, and track statistics.
          </span>
          <Link to={createPageUrl("SubscriptionCheckout")}>
            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold ml-4">
              View Plans
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}