import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook to check organization subscription access
 * @param {Object} organization - Organization object
 * @returns {Object} - Subscription access utilities
 */
export function useSubscription(organization) {
  const tier = organization?.subscription_tier || 'free';
  const status = organization?.subscription_status || 'trial';
  const selectedSport = organization?.selected_sport;

  // Check if trial is expired
  const isTrialExpired = () => {
    if (status !== 'trial' || !organization?.trial_end_date) return false;
    return new Date(organization.trial_end_date) < new Date();
  };

  // Check if subscription is active
  const isActive = status === 'active' || (status === 'trial' && !isTrialExpired());

  // Check if can create teams
  const canCreateTeams = isActive && (tier === 'basic' || tier === 'premium');

  // Check if can manage specific sport
  const canManageSport = (sport) => {
    if (!isActive) return false;
    if (tier === 'free') return false;
    if (tier === 'premium') return true;
    if (tier === 'basic') return selectedSport === sport;
    return false;
  };

  // Check if can assign multiple scorekeepers
  const canAssignMultipleScorekeepers = isActive && tier === 'premium';

  // Check if can use statisticians
  const canUseStatisticians = isActive && tier === 'premium';

  // Check if can use live streaming
  const canUseLiveStreaming = isActive && tier === 'premium';

  // Check if can use AI features
  const canUseAIFeatures = isActive && tier === 'premium';

  // Check if can manage multiple sports
  const canManageMultipleSports = isActive && tier === 'premium';

  // Get allowed sports
  const getAllowedSports = () => {
    if (!isActive) return [];
    if (tier === 'premium') return ['basketball', 'volleyball'];
    if (tier === 'basic' && selectedSport) return [selectedSport];
    return [];
  };

  return {
    tier,
    status,
    selectedSport,
    isActive,
    isTrialExpired: isTrialExpired(),
    canCreateTeams,
    canManageSport,
    canAssignMultipleScorekeepers,
    canUseStatisticians,
    canUseLiveStreaming,
    canUseAIFeatures,
    canManageMultipleSports,
    getAllowedSports,
  };
}