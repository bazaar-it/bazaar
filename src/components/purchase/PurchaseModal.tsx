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

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to calculate discount percentage
function calculateDiscount(pricePerPrompt: number, baseRate: number = 30): number | null {
  if (pricePerPrompt >= baseRate) return null;
  return Math.round(((baseRate - pricePerPrompt) / baseRate) * 100);
}

export function PurchaseModal({ isOpen, onClose }: PurchaseModalProps) {
  const [processingPackageId, setProcessingPackageId] = useState<string | null>(null);
  
  // Fetch packages from database
  const { data: packages, isLoading } = api.payment.getPackages.useQuery();
  
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
    setProcessingPackageId(packageId);
    await createCheckout.mutateAsync({ packageId });
  };

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
                      {pkg.popular && (
                        <div className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                          POPULAR
                        </div>
                      )}
                      {calculateDiscount(pkg.pricePerPrompt / 100) && (
                        <div className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded">
                          {calculateDiscount(pkg.pricePerPrompt / 100)}% off
                        </div>
                      )}
                    </div>
                    <div className="text-base text-gray-800 mb-2">
                      Get <span className="font-bold">{pkg.promptCount}</span> prompts at <span className="font-bold">€{(pkg.pricePerPrompt / 100).toFixed(2)}</span> each
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pkg.description}
                    </p>
                  </div>
                </div>

                <div className="ml-4 flex items-end">
                  <Button
                    onClick={() => handlePurchase(pkg.id)}
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

        {/* Footer message */}
        <div className="text-center text-sm text-muted-foreground mt-4">
          No subscriptions. No hidden fees.
        </div>
      </DialogContent>
    </Dialog>
  );
}