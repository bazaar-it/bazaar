"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { NewProjectButton } from "~/components/client/NewProjectButton";
import MarketingHeader from "~/components/marketing/MarketingHeader";
import type { MarketingHeaderRef } from "~/components/marketing/MarketingHeader";
import ScrollHeroAnimation from "~/components/marketing/ScrollHeroAnimation";
import TemplateScrollGrid from "~/components/TemplateScrollGrid";

export default function DemoScrollPage() {
  const { data: session, status } = useSession();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [tryForFreeLoading, setTryForFreeLoading] = useState(false);
  const marketingHeaderRef = useRef<MarketingHeaderRef>(null);

  const handleTryForFree = async () => {
    if (status === "authenticated" && session?.user) {
      return;
    } else {
      marketingHeaderRef.current?.openLoginModal();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader ref={marketingHeaderRef} redirectTo="/demo-scroll" />
      
      {/* Hero with Scroll Animation */}
      <ScrollHeroAnimation onAnimationComplete={() => setAnimationComplete(true)} />
      
      {/* Rest of content appears after animation */}
      <div className={`transition-opacity duration-1000 ${animationComplete ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Templates Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-white to-pink-50/20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                50+ Templates to Start From
              </h2>
            </div>
            
            <div className="mb-12">
              <TemplateScrollGrid />
            </div>
            
            {/* CTA */}
            <div className="text-center">
              {status === "authenticated" && session?.user ? (
                <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
                  <NewProjectButton
                    enableQuickCreate={true}
                    className="!bg-white !px-8 !py-4 !rounded-lg !text-lg !font-semibold hover:!bg-gradient-to-r hover:!from-pink-500 hover:!to-orange-500 hover:!text-white !transition-colors"
                    variant="ghost"
                  >
                    Start Creating Now
                  </NewProjectButton>
                </div>
              ) : (
                <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
                  <button
                    onClick={handleTryForFree}
                    disabled={tryForFreeLoading}
                    className="bg-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white transition-colors"
                  >
                    Start Creating Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}