"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { ShoppingCart, Zap, Star, Check } from "lucide-react";
import { toast } from "sonner";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PurchaseModal({ isOpen, onClose }: PurchaseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { data: packages, isLoading } = api.payment.getPackages.useQuery(
    undefined,
    { enabled: isOpen }
  );
  
  const createCheckout = api.payment.createCheckout.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.checkoutUrl;
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create checkout");
      setIsProcessing(false);
    },
  });

  const handlePurchase = async (packageId: string) => {
    setIsProcessing(true);
    await createCheckout.mutateAsync({ packageId });
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Buy More Prompts
          </DialogTitle>
          <DialogDescription>
            Choose a package to get more prompts for your projects. Prompts never expire!
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-4">
          {packages?.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative border rounded-lg p-4 transition-all hover:shadow-md ${
                pkg.popular 
                  ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-200" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Popular badge */}
              {pkg.popular && (
                <div className="absolute -top-2 left-4">
                  <div className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{pkg.name}</h3>
                    {pkg.savings > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        Save {pkg.savings}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {pkg.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{pkg.promptCount.toLocaleString()} prompts</span>
                    </div>
                    <div className="text-muted-foreground">
                      {pkg.pricePerPrompt.toFixed(1)}¢ per prompt
                    </div>
                  </div>

                  {/* Value props */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-green-600" />
                      <span>Never expire</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-green-600" />
                      <span>Instant delivery</span>
                    </div>
                    {pkg.promptCount >= 100 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-green-600" />
                        <span>Best value per prompt</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right ml-6">
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    ${(pkg.price / 100).toFixed(2)}
                  </div>
                  <Button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={isProcessing}
                    variant={pkg.popular ? "default" : "outline"}
                    className={`w-24 ${
                      pkg.popular 
                        ? "bg-blue-600 hover:bg-blue-700" 
                        : ""
                    }`}
                  >
                    {isProcessing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      "Buy Now"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-1 mt-0.5">
              <Zap className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900 mb-1">
                What can you do with prompts?
              </p>
              <ul className="text-gray-600 space-y-0.5">
                <li>• Generate AI-powered video scenes</li>
                <li>• Create custom motion graphics</li>
                <li>• Build professional presentations</li>
                <li>• Export unlimited videos</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Secure payment notice */}
        <div className="text-center text-xs text-muted-foreground">
          🔒 Secure payment processed by Stripe
        </div>
      </DialogContent>
    </Dialog>
  );
}