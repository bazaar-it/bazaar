"use client";

import { api } from "~/trpc/react";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";
import { Zap } from "lucide-react";

export function PromptUsageDisplay() {
  const { data: usage, isLoading } = api.usage.getPromptUsage.useQuery(
    undefined,
    { 
      refetchInterval: 30000, // Refresh every 30 seconds
      refetchOnWindowFocus: true,
    }
  );

  if (isLoading || !usage) return null;

  const percentage = (usage.used / usage.limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = usage.used >= usage.limit;

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-muted-foreground">
        <span className={`font-mono ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : ''}`}>
          {usage.used}/{usage.limit}
        </span>
        <span className="ml-1">prompts today</span>
      </div>
      
      <div className="w-24">
        <Progress 
          value={percentage} 
          className="h-2"
          indicatorClassName={
            isAtLimit ? 'bg-red-500' : 
            isNearLimit ? 'bg-orange-500' : 
            'bg-blue-500'
          }
        />
      </div>

      {isAtLimit && (
        <Button size="sm" variant="default" className="gap-1">
          <Zap className="h-3 w-3" />
          Buy More
        </Button>
      )}
    </div>
  );
}