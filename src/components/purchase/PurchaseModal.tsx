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
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// New pricing structure matching user requirements
const packages = [
  {
    id: "starter",
    price: 1000, // €10.00 in cents
    prompts: 33,
    pricePerPrompt: 0.30,
    description: "Perfect for trying things out.",
    discount: null // Base rate, no discount
  },
  {
    id: "popular",
    price: 2500, // €25.00 in cents
    prompts: 125,
    pricePerPrompt: 0.20,
    description: "More prompts, better value.",
    discount: 33 // 33% discount from base rate
  },
  {
    id: "power",
    price: 10000, // €100.00 in cents
    prompts: 1000,
    pricePerPrompt: 0.10,
    description: "Best value for power users.",
    discount: 67 // 67% discount from base rate
  }
];

export function PurchaseModal({ isOpen, onClose }: PurchaseModalProps) {
  const [processingPackageId, setProcessingPackageId] = useState<string | null>(null);
  
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
          {packages.map((pkg) => (
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
                      {pkg.discount && (
                        <div className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded">
                          {pkg.discount}% off
                        </div>
                      )}
                    </div>
                    <div className="text-base text-gray-800 mb-2">
                      Get <span className="font-bold">{pkg.prompts}</span> prompts at <span className="font-bold">€{pkg.pricePerPrompt.toFixed(2)}</span> each
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
          ))}
        </div>

        {/* Footer message */}
        <div className="text-center text-sm text-muted-foreground mt-4">
          No subscriptions. No hidden fees.
        </div>
      </DialogContent>
    </Dialog>
  );
}