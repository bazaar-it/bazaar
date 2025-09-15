"use client";

import { api } from "~/trpc/react";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";
import { Zap, Sparkles } from "lucide-react";
import { useState } from "react";
import { PurchaseModal } from "../purchase/PurchaseModal";

export function PromptUsageDisplay() {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const { data: usage, isLoading } = api.usage.getPromptUsage.useQuery(
    undefined,
    { 
      refetchInterval: 30000, // Refresh every 30 seconds
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 5000, // Consider data stale after 5 seconds
    }
  );

  if (isLoading || !usage) return null;

  // Check if user is admin (limit will be 999999)
  const isAdmin = usage.limit === 999999;
  
  const freeUsed = isAdmin ? 0 : Math.min(usage.used, usage.limit);
  const freeRemaining = isAdmin ? 0 : Math.max(0, usage.limit - usage.used);
  const purchasedUsed = isAdmin ? 0 : Math.max(0, usage.used - usage.limit);
  const totalAvailable = isAdmin ? 999999 : (freeRemaining + usage.purchased);
  
  const percentage = isAdmin ? 0 : (usage.used / usage.limit) * 100;
  const isUsingPurchased = !isAdmin && usage.used > usage.limit;
  const hasNoPromptsLeft = !isAdmin && totalAvailable === 0;

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="text-sm">
          {isAdmin ? (
            <>
              {/* Admin display */}
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-muted-foreground">
                  Admin: <span className="font-mono text-purple-600">
                    {usage.used} used today
                  </span>
                  {usage.used > 5 && (
                    <span className="text-xs text-gray-500 ml-1">
                      (5 free + {usage.used - 5} purchased)
                    </span>
                  )}
                </span>
              </div>
              
              {/* Show purchased credits for admin */}
              {(usage.purchased > 0 || usage.used > 5) && (
                <div className="flex items-center gap-2 mt-1">
                  <Zap className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="text-muted-foreground">
                    Purchased: <span className="font-mono text-yellow-600">
                      {usage.purchased}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      remaining
                    </span>
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Non-admin display */}
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-muted-foreground">
                  Free: <span className={`font-mono ${freeRemaining === 0 ? 'text-gray-400' : 'text-blue-600'}`}>
                    {freeRemaining}/{usage.limit}
                  </span>
                </span>
              </div>
              
              {/* Purchased prompts display */}
              {(usage.purchased > 0 || isUsingPurchased) && (
                <div className="flex items-center gap-2 mt-1">
                  <Zap className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="text-muted-foreground">
                    {usage.purchased === 20 ? 'Free:' : 'Purchased:'} <span className={`font-mono ${usage.purchased === 0 ? 'text-gray-400' : 'text-yellow-600'}`}>
                      {usage.purchased}
                    </span>
                    {isUsingPurchased && (
                      <span className="text-xs text-yellow-600 ml-1">(in use)</span>
                    )}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Progress bar for free prompts only (not for admins) */}
        {!isAdmin && (
          <div className="w-24">
            <Progress 
              value={Math.min(percentage, 100)} 
              className="h-2"
            />
          </div>
        )}

        {/* Buy button when out of prompts */}
        {hasNoPromptsLeft && (
          <Button 
            size="sm" 
            variant="default" 
            className="gap-1"
            onClick={() => setShowPurchaseModal(true)}
          >
            <Zap className="h-3 w-3" />
            Buy More
          </Button>
        )}
      </div>

      <PurchaseModal 
        isOpen={showPurchaseModal} 
        onClose={() => setShowPurchaseModal(false)} 
      />
    </>
  );
}
