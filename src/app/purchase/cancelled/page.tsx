// src/app/purchase/cancelled/page.tsx
"use client";

import { Button } from "~/components/ui/button";
import Link from "next/link";
import { XCircle, ArrowLeft } from "lucide-react";

export default function PurchaseCancelledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-gray-600">
            No worries! Your payment was cancelled and no charges were made.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">
            💡 You can always purchase prompts later when you need them!
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/projects" className="flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Continue with Free Prompts
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}