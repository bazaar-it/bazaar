// src/app/purchase/success/page.tsx
"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

function PurchaseSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const router = useRouter();
  const utils = api.useUtils();
  
  useEffect(() => {
    // Invalidate usage queries to force refresh
    utils.usage.getPromptUsage.invalidate();
    utils.payment.getUserCredits.invalidate();
    
    // Show success toast
    toast.success("Payment successful! Your prompts have been added.");
    
    // Get last project from localStorage
    const lastProjectId = localStorage.getItem("lastProjectId");
    
    // Optional: Auto-redirect after 3 seconds
    if (lastProjectId) {
      const timer = setTimeout(() => {
        router.push(`/projects/${lastProjectId}/generate`);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [utils, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🎉 Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your prompts have been added to your account and are ready to use.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 font-medium">
            ✨ Your prompts are now available in your profile dropdown!
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/" className="flex items-center justify-center gap-2">
              Start Creating
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              Back to Home
            </Link>
          </Button>
        </div>

        {sessionId && (
          <p className="text-xs text-gray-400 mt-4">
            Session: {sessionId}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
        </div>
      </div>
    }>
      <PurchaseSuccessContent />
    </Suspense>
  );
}