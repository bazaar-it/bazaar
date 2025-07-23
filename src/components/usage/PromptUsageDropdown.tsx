"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { ShoppingCart } from "lucide-react";
import { PurchaseModal } from "~/components/purchase/PurchaseModal";

export function PromptUsageDropdown() {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  
  const { data: promptUsage, isLoading } = api.usage.getPromptUsage.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="px-2 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Loading prompts...</span>
        </div>
      </div>
    );
  }

  if (!promptUsage) {
    return null;
  }

  const { used, limit, purchased = 0 } = promptUsage;
  const totalAvailable = (limit - used) + purchased;
  const isRunningLow = totalAvailable < 5;
  const isOut = totalAvailable === 0;

  return (
    <div className="px-2 py-2 space-y-2">
      {/* Daily prompts display */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Prompts:</span>
        <span className="font-medium">
          {used}/{limit} free daily
        </span>
      </div>

      {/* Purchased prompts display */}
      {purchased > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="w-4" /> {/* Spacer for alignment */}
          <span className="text-blue-600 font-medium">
            +{purchased} {purchased === 20 ? 'Free' : 'purchased'}
          </span>
        </div>
      )}

      {/* Buy more button - always show */}
      <Button
        size="sm"
        variant={isOut ? "default" : "outline"}
        className="w-full mt-2 gap-2"
        onClick={() => setIsPurchaseModalOpen(true)}
      >
        <ShoppingCart className="h-4 w-4" />
        {isOut ? "Buy Prompts" : "Top Up"}
      </Button>

      {/* Status message */}
      {isOut ? (
        <p className="text-xs text-orange-600 text-center">
          You're out of prompts for today
        </p>
      ) : isRunningLow ? (
        <p className="text-xs text-yellow-600 text-center">
          Running low on prompts
        </p>
      ) : null}

      {/* Purchase Modal */}
      <PurchaseModal 
        isOpen={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
      />
    </div>
  );
}