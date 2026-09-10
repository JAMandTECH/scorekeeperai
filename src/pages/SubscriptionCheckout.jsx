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
  const [billingCycle, setBillingCycle] = useState('monthly');
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

      try {
        const res = await base44.functions.invoke('getUserOrganization', {});
        setOrganization(res?.data?.organization || null);
      } catch {
        setOrganization(null);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const currentTier = organization?.subscription_tier || 'free';
  const subscriptionStatus = organization?.subscription_status || 'trial';

  const tiers = [
    {
      name: 'Free',
      value: 'free',
      monthly: 0,
      yearly: 0,
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
      monthly: 35,
      yearly: 35 * 12,
      icon: Star,
      color: 'blue',
      popular: currentTier === 'free',
      features: [
        'Manage 1 organization',
        'Single sport only',
        'Team & player management',
        'Game scheduling & live scoring',
        '1 scorekeeper (full control)',
        'Basic statistics & standings',
        'Social feed (view only)',
      ],
    },
    {
      name: 'Premium',
      value: 'premium',
      monthly: 50,
      yearly: 50 * 12,
      icon: Crown,
      color: 'purple',
      popular: true,
      features: [
        'Everything in Basic',
        'Multiple sports support',
        'Multiple scorekeepers & statisticians',
        'Tournament bracket management',
        'Live streaming integration',
        'AI poster generation',
        'AI game summaries & insights',
        'Voice assistant scoring',
        'Automated data backup & restore',
        'Advanced analytics & leaderboards',
        'Full social feed with media',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                <h1 className="font-heading text-3xl font-bold tracking-tight mb-3">
                  Choose Your Plan
                </h1>
                <p className="text-lg text-muted-foreground">
                  Upgrade your organization to unlock advanced features
                </p>
              </div>

              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center gap-2">
                <Button variant={billingCycle === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setBillingCycle('monthly')}>
                  Monthly
                </Button>
                <Button variant={billingCycle === 'yearly' ? 'default' : 'outline'} size="sm" onClick={() => setBillingCycle('yearly')}>
                  Yearly
                </Button>
                {billingCycle === 'yearly' && (
                  <span className="text-xs text-muted-foreground">Yearly billing coming soon</span>
                )}
              </div>

              {/* Current Status */}
              {currentTier !== 'free' && (
                <Alert className="bg-muted border border-border">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <AlertDescription className="text-foreground">
                    Current Plan: <strong>{currentTier.toUpperCase()}</strong> • Status: <strong>{subscriptionStatus.toUpperCase()}</strong>
                    {subscriptionStatus === 'trial' && organization?.trial_end_date && (
                      <> • Trial ends: {new Date(organization.trial_end_date).toLocaleDateString()}</>
                    )}
                  </AlertDescription>
                </Alert>
              )}



              {/* Pricing Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {tiers.map((tier) => {
                  const Icon = tier.icon;
                  const isCurrentTier = currentTier === tier.value;

                  return (
                    <Card
                      key={tier.value}
                      className={`relative ${
                         tier.popular
                           ? 'border-primary border-2'
                           : ''
                       } transition-colors hover:border-foreground/20`}
                    >
                      {tier.popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <Badge className="px-4 py-1 font-medium">
                            RECOMMENDED
                          </Badge>
                        </div>
                      )}
                      {tier.value === 'premium' && (
                        <div className="absolute -top-4 right-4">
                          <Badge variant="outline" className="border-primary text-primary px-3 py-1 font-medium">
                            BEST VALUE
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="text-center pb-6 pt-5">
                        <div className={`w-16 h-16 mx-auto mb-4 border flex items-center justify-center ${
                          tier.color === 'purple' ? 'border-primary' :
                          tier.color === 'blue' ? 'border-foreground' :
                          'border-border'
                        }`}>
                          <Icon className={`w-8 h-8 ${
                            tier.color === 'purple' ? 'text-primary' :
                            tier.color === 'blue' ? 'text-foreground' :
                            'text-muted-foreground'
                          }`} />
                        </div>
                        <CardTitle className="text-2xl font-heading font-bold mb-2">
                          {tier.name}
                        </CardTitle>
                        <div className="font-heading text-4xl font-bold tabular-nums">
                          AUD ${billingCycle === 'monthly' ? tier.monthly : tier.yearly}
                          <span className="text-lg font-normal text-muted-foreground">
                            /{billingCycle === 'monthly' ? 'month' : 'year'}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="space-y-2.5">
                          {tier.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-foreground">{feature}</span>
                            </div>
                          ))}
                        </div>

                        {tier.value === 'basic' && selectedTier === 'basic' && (
                          <div className="pt-4 border-t border-border">
                            <label className="block text-sm font-heading font-bold text-foreground mb-2">
                              Select Your Sport:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant={selectedSport === 'basketball' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedSport('basketball')}
                              >
                                Basketball
                              </Button>
                              <Button
                                variant={selectedSport === 'volleyball' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedSport('volleyball')}
                              >
                                Volleyball
                              </Button>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => handleSubscribe(tier.value)}
                          disabled={isCurrentTier || processingPayment || (billingCycle === 'yearly' && tier.value !== 'free')}
                          variant={isCurrentTier ? "outline" : "default"}
                          className="w-full font-medium"
                        >
                          {billingCycle === 'yearly' && tier.value !== 'free' ? (
                            'Yearly billing coming soon'
                          ) : isCurrentTier ? (
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
                          <p className="text-center text-xs text-primary font-medium">
                            ✓ Active Plan
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* FAQ Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-heading font-bold">
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-heading font-bold text-foreground mb-1">Can I cancel anytime?</h3>
                    <p className="text-sm text-muted-foreground">
                      Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-foreground mb-1">What happens after the trial?</h3>
                    <p className="text-sm text-muted-foreground">
                      Your 30-day trial gives you full access to your selected tier. After the trial, you'll need to subscribe to continue using premium features.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-foreground mb-1">Can I upgrade or downgrade later?</h3>
                    <p className="text-sm text-muted-foreground">
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