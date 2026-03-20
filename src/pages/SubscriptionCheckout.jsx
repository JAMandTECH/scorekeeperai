import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Gift, ArrowRight, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function SubscriptionCheckout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedSport, setSelectedSport] = useState('basketball');
  const [processingPayment, setProcessingPayment] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    initializePage();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const initializePage = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);

      const orgId = currentUser.organization_id;
      if (orgId) {
        const orgs = await base44.entities.Organization.list();
        const userOrg = orgs.find(o => o.id === orgId);
        setOrganization(userOrg);
      }
    } catch (error) {
      base44.auth.redirectToLogin(createPageUrl("SubscriptionCheckout"));
    }
    setLoading(false);
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
    base44.auth.logout(createPageUrl("Home"));
  };

  const handleSubscribe = async (tier) => {
    if (tier === 'free') {
      if (window.confirm('Downgrade to Free? This will cancel your paid subscription.')) {
        try {
          await base44.entities.Organization.update(organization.id, {
            subscription_tier: 'free',
            subscription_status: 'cancelled'
          });
          window.location.reload();
        } catch (error) {
          alert('Failed to downgrade: ' + (error?.message || 'Unknown error'));
        }
      }
      return;
    }

    setSelectedTier(tier);
    setProcessingPayment(true);

    try {
      const isIframe = window.top !== window.self;
      if (isIframe) {
        alert('Checkout must be opened from a published app (not inside the editor). Please open your app in a new tab.');
        setProcessingPayment(false);
        return;
      }
      const response = await base44.functions.invoke('stripeCheckout', {
        organization_id: organization.id,
        tier,
        selected_sport: tier === 'basic' ? selectedSport : null,
      });

      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (error) {
      console.error('=== SUBSCRIPTION ERROR ===');
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error message:', error.message);

      const errorDetails = error.response?.data || {};
      const errorMsg = JSON.stringify(errorDetails, null, 2) || error.message;

      alert(`Failed to create subscription:\n\n${errorMsg}\n\nCheck the browser console for full error details and Dashboard → Code → Functions → createPayPalSubscription logs for backend errors.`);
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const currentTier = organization?.subscription_tier || 'free';
  const subscriptionStatus = organization?.subscription_status || 'trial';

  const tiers = [
    {
      name: 'Free',
      value: 'free',
      price: 'AUD $0',
      icon: Gift,
      color: 'gray',
      features: [
        'View public live scores',
        'Browse team statistics',
        'No team management',
        'No scorekeeping access',
      ],
    },
    {
      name: 'Basic',
      value: 'basic',
      price: 'AUD $25',
      period: '/month',
      icon: Star,
      color: 'blue',
      popular: currentTier === 'free',
      features: [
        'Manage 1 organization',
        'Single sport only',
        '1 scorekeeper (full control)',
        'Basic statistics & reports',
        'Team & player management',
        'Game scheduling',
      ],
    },
    {
      name: 'Premium',
      value: 'premium',
      price: 'AUD $35',
      period: '/month',
      icon: Crown,
      color: 'purple',
      popular: currentTier === 'basic',
      features: [
        'Everything in Basic',
        'Multiple sports support',
        'Advanced statistics & AI insights',
        'Live streaming integration',
        'Multiple scorekeepers',
        'Dedicated statisticians',
        'Tournament bracket management',
      ],
    },
  ];

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
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header */}
              <div className="text-center">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-3">
                  Choose Your Plan
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Upgrade your organization to unlock advanced features
                </p>
              </div>

              {/* Current Status */}
              {currentTier !== 'free' && (
                <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 dark:text-blue-300">
                    Current Plan: <strong>{currentTier.toUpperCase()}</strong> • Status: <strong>{subscriptionStatus.toUpperCase()}</strong>
                    {subscriptionStatus === 'trial' && organization?.trial_end_date && (
                      <> • Trial ends: {new Date(organization.trial_end_date).toLocaleDateString()}</>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Setup Instructions */}
              <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-300">
                  <strong>Setup Complete:</strong> Stripe is in Test Mode. Use 4242 4242 4242 4242 and switch to Live keys in Dashboard → Integrations to go live.
                </AlertDescription>
              </Alert>

              {/* Pricing Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                {tiers.map((tier) => {
                  const Icon = tier.icon;
                  const isCurrentTier = currentTier === tier.value;

                  return (
                    <Card
                      key={tier.value}
                      className={`relative ${
                        tier.popular
                          ? 'border-4 border-purple-400 dark:border-purple-600 shadow-2xl scale-105'
                          : 'border-2 border-gray-200 dark:border-gray-700'
                      } bg-white dark:bg-gray-800 transition-all hover:shadow-xl`}
                    >
                      {tier.popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-4 py-1 font-bold">
                            RECOMMENDED
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="text-center pb-8 pt-6">
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-gradient-to-br ${
                          tier.color === 'purple' ? 'from-purple-500 to-pink-500' :
                          tier.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                          'from-gray-400 to-gray-500'
                        } shadow-lg`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                          {tier.name}
                        </CardTitle>
                        <div className="text-4xl font-black text-gray-900 dark:text-white">
                          {tier.price}
                          {tier.period && (
                            <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                              {tier.period}
                            </span>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-6">
                        <div className="space-y-3">
                          {tier.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                            </div>
                          ))}
                        </div>

                        {tier.value === 'basic' && selectedTier === 'basic' && (
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Select Your Sport:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant={selectedSport === 'basketball' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedSport('basketball')}
                                className={selectedSport === 'basketball' ? 'bg-orange-600' : ''}
                              >
                                Basketball
                              </Button>
                              <Button
                                variant={selectedSport === 'volleyball' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedSport('volleyball')}
                                className={selectedSport === 'volleyball' ? 'bg-blue-600' : ''}
                              >
                                Volleyball
                              </Button>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => handleSubscribe(tier.value)}
                          disabled={isCurrentTier || processingPayment}
                          className={`w-full font-bold ${
                            isCurrentTier
                              ? 'bg-gray-400 cursor-not-allowed'
                              : tier.color === 'purple'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                              : tier.color === 'blue'
                              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                              : 'bg-gray-600 hover:bg-gray-700'
                          } text-white`}
                        >
                          {isCurrentTier ? (
                            'Current Plan'
                          ) : processingPayment && selectedTier === tier.value ? (
                            'Processing...'
                          ) : tier.value === 'free' ? (
                            'Downgrade to Free'
                          ) : (
                            <>
                              Subscribe Now <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>

                        {isCurrentTier && (
                          <p className="text-center text-xs text-green-600 dark:text-green-400 font-bold">
                            ✓ Active Plan
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* FAQ Section */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Can I cancel anytime?</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">What happens after the trial?</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your 30-day trial gives you full access to your selected tier. After the trial, you'll need to subscribe to continue using premium features.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Can I upgrade or downgrade later?</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Yes, you can change your plan at any time. Changes take effect immediately and billing is prorated.
                    </p>
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