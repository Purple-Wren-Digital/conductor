"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Users, Zap, Building } from "lucide-react";
import { plans } from "@/lib/plans";
import { useFetchWithAuth } from "@/lib/api/fetch-with-auth";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@clerk/nextjs";

interface SubscriptionData {
  id: string;
  status: string;
  planType: string;
  includedSeats: number;
  additionalSeats: number;
  totalSeats: number;
  usedSeats: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt: string | null;
  trialEnd: string | null;
  features: any;
}

function SubscriptionPageContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  const expired = searchParams.get("expired");

  const rawFetchWithAuth = useFetchWithAuth();
  const fetchWithAuth = useCallback(rawFetchWithAuth, [rawFetchWithAuth]);
  const { isLoaded, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [selectedPlan, setSelectedPlan] = useState<string>(
    plans[0].stripePriceId
  );
  const [additionalSeats, setAdditionalSeats] = useState(0);
  const [organizationName, setOrganizationName] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchCurrentSubscription = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/subscription/current");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      } else if (response.status === 404) {
        // No subscription found
        setSubscription(null);
      }
    } catch {
      // Continue without subscription data
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  // Fetch current subscription
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchCurrentSubscription();
    } else if (isLoaded && !isSignedIn) {
      // User is not signed in, loading is done but no subscription to fetch
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, fetchCurrentSubscription]);

  const handleCreateCheckoutSession = async () => {
    setCheckoutLoading(true);
    try {
      const plan = plans.find((p) => p.stripePriceId === selectedPlan);
      if (!plan) {
        alert("Please select a plan");
        setCheckoutLoading(false);
        return;
      }

      const response = await fetchWithAuth("/subscription/checkout", {
        method: "POST",
        body: JSON.stringify({
          planType: plan.planType,
          additionalSeats: additionalSeats,
          organizationName: organizationName || undefined,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        const error = await response.text();
        alert(`Failed to create checkout session: ${error}`);
      }
    } catch {
      alert("Failed to create checkout session. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetchWithAuth("/subscription/portal", {
        method: "POST",
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        const error = await response.text();
        alert(`Failed to open billing portal: ${error}`);
      }
    } catch {
      alert("Failed to open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        color: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      ACTIVE: { color: "default", label: "Active" },
      TRIALING: { color: "secondary", label: "Trial" },
      PAST_DUE: { color: "destructive", label: "Past Due" },
      CANCELED: { color: "outline", label: "Canceled" },
    };

    const variant = variants[status] || { color: "outline", label: status };
    return <Badge variant={variant.color}>{variant.label}</Badge>;
  };

  const calculateTotalPrice = () => {
    const plan = plans.find((p) => p.stripePriceId === selectedPlan);
    if (!plan || plan.monthlyPrice === null) return 0;
    return plan.monthlyPrice + additionalSeats * plan.additionalSeatPrice;
  };

  if (loading) {
    return (
      <main className="container">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-8">Subscription Management</h1>

      {/* Alerts */}
      {success === "true" && (
        <Alert className="mb-6">
          <Check className="h-4 w-4" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            Your subscription has been activated successfully.
          </AlertDescription>
        </Alert>
      )}

      {canceled === "true" && (
        <Alert className="mb-6" variant="destructive">
          <X className="h-4 w-4" />
          <AlertTitle>Checkout Canceled</AlertTitle>
          <AlertDescription>
            The checkout process was canceled. No charges were made.
          </AlertDescription>
        </Alert>
      )}

      {expired === "true" && (
        <Alert className="mb-6" variant="destructive">
          <AlertTitle>Subscription Expired</AlertTitle>
          <AlertDescription>
            Your subscription has expired or is inactive. Please update your
            billing to continue.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Subscription */}
      {subscription && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>
                  Your organization&apos;s subscription details
                </CardDescription>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <Label className="text-sm text-muted-foreground">Plan</Label>
                <p className="text-lg font-semibold capitalize">
                  {subscription.planType.toLowerCase()}
                </p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Seats</Label>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <p className="text-lg">
                    {subscription.usedSeats} / {subscription.totalSeats}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Billing Period
                </Label>
                <p className="text-sm">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>

              {subscription.trialEnd &&
                new Date(subscription.trialEnd) > new Date() && (
                  <div className="col-span-full">
                    <Alert>
                      <AlertDescription>
                        Trial ends on{" "}
                        {new Date(subscription.trialEnd).toLocaleDateString()}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
            </div>

            <div className="mt-6">
              <Button
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Manage Subscription"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Subscription / Upgrade */}
      {!subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>
              Select the plan that best fits your team&apos;s needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Organization Name Input (optional) */}
            <div className="mb-6">
              <Label htmlFor="orgName" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Organization Name (Optional)
              </Label>
              <Input
                id="orgName"
                type="text"
                placeholder="Enter your organization name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                If left blank, we&apos;ll create one based on your account name
              </p>
            </div>

            <RadioGroup
              value={selectedPlan}
              onValueChange={setSelectedPlan}
              className="space-y-4"
            >
              {plans.map((plan) => (
                <div key={plan.stripePriceId} className="relative">
                  <div
                    className={`border rounded-lg p-6 cursor-pointer transition-colors ${
                      selectedPlan === plan.stripePriceId
                        ? "border-primary bg-primary/5"
                        : "border-gray-200"
                    }`}
                  >
                    <label
                      htmlFor={plan.stripePriceId}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem
                          value={plan.stripePriceId}
                          id={plan.stripePriceId}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                {plan.name}
                                {"popular" in plan && plan.popular && (
                                  <Badge variant="secondary">Popular</Badge>
                                )}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {plan.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">
                                {plan.monthlyPrice
                                  ? `$${plan.monthlyPrice}`
                                  : "Request a quote"}
                                {plan.monthlyPrice && (
                                  <span className="text-sm font-normal text-muted-foreground">
                                    /month
                                  </span>
                                )}
                              </p>
                              {plan.monthlyPrice && (
                                <p className="text-sm text-muted-foreground">
                                  {plan.includedSeats} seats included
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            {plan.features.map((feature, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <Check className="h-4 w-4 text-green-500" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>

                          {selectedPlan === plan.stripePriceId &&
                            plan.additionalSeatPrice > 0 && (
                              <div className="mt-4 p-4 bg-secondary/10 rounded-lg">
                                <Label htmlFor="additionalSeats">
                                  Additional Seats
                                </Label>
                                <div className="flex items-center gap-3 mt-2">
                                  <Input
                                    id="additionalSeats"
                                    type="number"
                                    min="0"
                                    value={additionalSeats}
                                    onChange={(e) =>
                                      setAdditionalSeats(
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-24"
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    × ${plan.additionalSeatPrice}/seat = $
                                    {additionalSeats * plan.additionalSeatPrice}
                                  </span>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-6 flex justify-between items-center">
              <div>
                <p className="text-lg">
                  Total:{" "}
                  <span className="font-bold">
                    ${calculateTotalPrice()}/month
                  </span>
                </p>
              </div>
              <Button
                onClick={handleCreateCheckoutSession}
                disabled={checkoutLoading}
                size="lg"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Start 14-Day Free Trial
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SubscriptionPageContent />
    </Suspense>
  );
}
