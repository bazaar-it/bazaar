"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Skeleton } from "~/components/ui/skeleton";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useEffect, useCallback } from "react";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to get custom discount percentage
function getDiscountPercentage(price: number): number | null {
  // Custom discount percentages based on price
  if (price === 2500) return 33; // €25 option gets 33% off
  if (price === 10000) return 66; // €100 option gets 66% off
  return null; // No discount for other options
}

export function PurchaseModal({ isOpen, onClose }: PurchaseModalProps) {
  const [processingPackageId, setProcessingPackageId] = useState<string | null>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  
  // Fetch packages from database
  const { data: packages, isLoading } = api.payment.getPackages.useQuery();
  
  // Track paywall events
  const trackEvent = api.payment.trackPaywallEvent.useMutation();
  
  // Validate promo code
  const { data: promoValidation, refetch: validatePromo } = api.payment.validatePromoCode.useQuery(
    { code: promoCode, packageId: selectedPackageId || undefined },
    { 
      enabled: false, // Only run when we call refetch
      retry: false
    }
  );
  
  const createCheckout = api.payment.createCheckout.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.checkoutUrl;
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create checkout");
      setProcessingPackageId(null);
    },
  });

  const handlePurchase = async (packageId: string) => {
    // Track package click event
    trackEvent.mutate({ 
      eventType: 'clicked_package', 
      packageId,
      metadata: { source: 'purchase_modal', promo_code: promoCode || null }
    });
    
    setProcessingPackageId(packageId);
    
    // Track checkout initiation
    trackEvent.mutate({ 
      eventType: 'initiated_checkout', 
      packageId,
      metadata: { source: 'purchase_modal', promo_code: promoCode || null }
    });
    
    // Include promo code in checkout if valid
    await createCheckout.mutateAsync({ 
      packageId,
      promoCode: promoValidation?.valid ? promoCode : undefined
    });
  };
  
  const handlePromoCodeChange = async (code: string) => {
    setPromoCode(code);
    setPromoError(null);
    
    if (code.length > 0 && selectedPackageId) {
      const result = await validatePromo();
      if (result.data && !result.data.valid) {
        setPromoError(result.data.error || "Invalid promo code");
      }
    }
  };
  
  // Track modal view when opened
  useEffect(() => {
    if (isOpen && !hasTrackedView) {
      trackEvent.mutate({ 
        eventType: 'viewed',
        metadata: { source: 'purchase_modal' }
      });
      setHasTrackedView(true);
    }
    
    // Reset tracking when modal closes
    if (!isOpen) {
      setHasTrackedView(false);
    }
  }, [isOpen, hasTrackedView, trackEvent]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-semibold">
            Pay-Per-Prompt
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Top up with credits—valid for 12 months.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            // Loading skeletons
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : packages ? (
            packages.map((pkg) => (
            <div
              key={pkg.id}
              className="border rounded-lg p-4 transition-all hover:shadow-md hover:border-gray-300"
            >
              <div className="flex justify-between items-end">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-2xl font-bold text-gray-900">
                        €{pkg.price / 100}
                      </div>
                      {pkg.popular && pkg.price !== 2500 && (
                        <div className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                          POPULAR
                        </div>
                      )}
                      {getDiscountPercentage(pkg.price) && (
                        <div className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded">
                          {getDiscountPercentage(pkg.price)}% off
                        </div>
                      )}
                    </div>
                    <div className="text-base text-gray-800 mb-2">
                      Get <span className="font-bold">{pkg.promptCount}</span> prompts at <span className="font-bold">€{(pkg.pricePerPrompt / 100).toFixed(2)}</span> each
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex items-end">
                  <Button
                    onClick={() => {
                      setSelectedPackageId(pkg.id);
                      handlePurchase(pkg.id);
                    }}
                    onMouseEnter={() => setSelectedPackageId(pkg.id)}
                    disabled={processingPackageId !== null}
                    variant="outline"
                    className="bg-black hover:bg-white hover:text-black text-white border-black"
                  >
                    {processingPackageId === pkg.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      "Top-Up"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))
          ) : (
            <div className="text-center text-muted-foreground">
              No packages available
            </div>
          )}
        </div>

        {/* Promo code section */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <Label htmlFor="promo-code" className="text-sm font-medium">
            Have a promo code?
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="promo-code"
              type="text"
              placeholder="Enter code"
              value={promoCode}
              onChange={(e) => handlePromoCodeChange(e.target.value.toUpperCase())}
              className="flex-1"
            />
          </div>
          {promoError && (
            <p className="text-sm text-red-500 mt-1">{promoError}</p>
          )}
          {promoValidation?.valid && (
            <p className="text-sm text-green-600 mt-1">
              {promoValidation.discountDisplay} applied!
            </p>
          )}
        </div>

        {/* Footer message */}
        <div className="text-center text-sm text-muted-foreground mt-4">
          No subscriptions. No hidden fees.
        </div>
      </DialogContent>
    </Dialog>
  );
}