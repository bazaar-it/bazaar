
// src/app/(marketing)/page.tsx
"use client";
import { useState, lazy, Suspense, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { NewProjectButton } from "~/components/client/NewProjectButton";

import MarketingHeader from "~/components/marketing/MarketingHeader";
import type { MarketingHeaderRef } from "~/components/marketing/MarketingHeader";
import MarketingComponentPlayer from "~/components/MarketingComponentPlayer";
import HomePageTextAnimation from "~/components/HomePageTextAnimation";
import dynamic from 'next/dynamic';

const HomePageTemplatesSection = dynamic(
  () => import('~/components/marketing/HomePageTemplatesSection'),
  { ssr: false }
);
import AspectRatioTransitionPlayer from "~/components/AspectRatioTransitionPlayer";
import DynamicFormatTitle from "~/components/DynamicFormatTitle";
import ParticleEffect from "~/components/marketing/ParticleEffect";
import LiveBadge from "~/components/marketing/LiveBadge";
import { PurchaseModal } from "~/components/purchase/PurchaseModal";

function HomepageContent() {
  const { data: session, status } = useSession();
  const [intendedAction, setIntendedAction] = useState<'try-for-free' | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  
  // Add loading state for unauthenticated Try for Free button
  const [tryForFreeLoading, setTryForFreeLoading] = useState(false);
  
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);
  
  // Ref to access MarketingHeader methods
  const marketingHeaderRef = useRef<MarketingHeaderRef>(null);
  const searchParams = useSearchParams();

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Open pricing modal if pricing=1 is present
  useEffect(() => {
    const showPricing = searchParams?.get('pricing');
    if (showPricing === '1') {
      setShowTopUp(true);
    }
  }, [searchParams]);

  // Listen for footer-triggered modal open
  useEffect(() => {
    const handler = () => setShowTopUp(true);
    window.addEventListener('open-pricing-modal' as any, handler);
    return () => window.removeEventListener('open-pricing-modal' as any, handler);
  }, []);

  const handleTryForFree = async () => {
    if (status === "authenticated" && session?.user) {
      // User is logged in - the NewProjectButton will handle quick create with landscape format
      return;
    } else {
      setIntendedAction('try-for-free');
      // Open login modal using ref
      marketingHeaderRef.current?.openLoginModal();
    }
  };
  


  return (
    <div className="min-h-screen bg-white flex flex-col animate-fade-in">
      <MarketingHeader ref={marketingHeaderRef} redirectTo='/' />

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 md:py-8 max-w-6xl mx-auto w-full relative overflow-hidden">
        {/* Advanced Floating Particles - Hero Section Only */}
        <ParticleEffect />

        {/* Top badge area: Product Hunt badge moved here */}
        <div className="w-full mb-8 flex justify-center">
          <a
            href="https://www.producthunt.com/products/bazaar-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-bazaar-2"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="See Bazaar on Product Hunt"
          >
            <img
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=996887&theme=light"
              alt="Bazaar – Vibe Code your Software Demo Video on Product Hunt"
              width={250}
              height={54}
              className="w-[250px] h-[54px]"
            />
          </a>
        </div>
        
        <div className="mb-8 md:mb-16 w-full text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 md:mb-6 leading-tight text-gray-900 px-2">
            <span className="relative inline-block px-2 py-1 border-2 border-dashed border-gray-400 bg-white/60 backdrop-blur-sm rounded shadow-md mr-2">
              Screenshot
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-gray-400 rounded-sm"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-gray-400 rounded-sm"></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-gray-400 rounded-sm"></div>
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-gray-400 rounded-sm"></div>
              {/* Screenshot crosshair icon at bottom left corner */}
              <div className="absolute -bottom-3 -left-3 w-6 h-6 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-600">
                  <path fill="currentColor" d="M12 2a1 1 0 0 1 1 1v8h8a1 1 0 1 1 0 2h-8v8a1 1 0 1 1-2 0v-8H3a1 1 0 1 1 0-2h8V3a1 1 0 0 1 1-1z"/>
                </svg>
              </div>
            </span>
            <span className="ml-3">to Demo Video — in seconds</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 px-4">Bazaar is an AI video generator for creating software demo videos.</p>
        </div>
        
        <div className="w-full text-center mb-8 md:mb-16">
          {status === "authenticated" && session?.user ? (
            <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
              <NewProjectButton
                enableQuickCreate={true}
                disableFormatDropdown={false}
                className="!block !w-full !bg-white !px-6 md:!px-8 !py-3 md:!py-4 !rounded-lg !text-base md:!text-lg !font-semibold !shadow-none !hover:shadow-none !transform !hover:scale-[1.02] !transition-all !duration-200 !h-auto !border-none !cursor-pointer hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white focus:bg-gradient-to-r focus:from-pink-500 focus:to-orange-500 focus:text-white transition-colors !z-10 !relative"
                variant="ghost"
              >
                Start Creating Now
              </NewProjectButton>
            </div>
          ) : (
            <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
              <button
                onClick={async () => {
                  if (tryForFreeLoading) return; // Prevent multiple clicks
                  setTryForFreeLoading(true);
                  try {
                    await handleTryForFree();
                  } finally {
                    setTryForFreeLoading(false);
                  }
                }}
                disabled={tryForFreeLoading}
                className="inline-block bg-white px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg font-semibold shadow-none transform hover:scale-[1.02] transition-all duration-200 h-auto border-none hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white focus:bg-gradient-to-r focus:from-pink-500 focus:to-orange-500 focus:text-white transition-colors"
              >
                {tryForFreeLoading ? (
                  <svg className="animate-spin h-5 w-5 text-gray-900 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                ) : (
                  "Try for Free"
                )}
              </button>
            </div>
          )}
          <p className="text-center text-gray-500 text-sm mt-2 mb-0">
            Start with 100 free prompts
          </p>
          {/* Product Hunt badge moved to top */}
        </div>
        
        {/* Marketing Video Player - responsive positioning */}
        <div className="w-full mb-8">
          <div className="flex justify-center w-full px-2 sm:px-4">
            <div className="w-full max-w-4xl">
              <HomePageTextAnimation />
            </div>
          </div>
        </div>

        {/* Create viral videos section */}
        <section className="mt-0 w-full">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900 px-4">
              Create <span className="moving-gradient-text">Viral Videos</span> for your App
            </h2>
          </div>
          
          {/* YouTube Video Embed */}
          <div className="flex justify-center w-full px-2 sm:px-4">
            <div className="w-full max-w-4xl">
              <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/zZgUWZfQjxM?si=QFlsfGu1Ya1Z68oD&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&fs=0&disablekb=1"
                  
                  
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Prompt it to Perfection Section */}
        <section className="mt-16 md:mt-32 w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900 px-4">
              <span className="relative inline-block">
                <span className="moving-gradient-text">Prompt</span>
              </span> it to Perfection
            </h2>
          </div>
          
          {/* Video Player */}
          <div className="flex justify-center w-full px-2 sm:px-4">
            <div className="w-full max-w-5xl">
              <MarketingComponentPlayer />
            </div>
          </div>
        </section>

        {/* Showcase of Three Bazaar Videos Section - COMMENTED OUT: Not finished yet */}
        {/* <section className="mt-16 w-full py-8 md:py-12 -mx-4 px-4 bg-gradient-to-b from-white to-gray-50/50">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900 px-4">
              Made with <span className="moving-gradient-text">Bazaar</span>
            </h2>
          </div>
          
          <div className="flex justify-center w-full px-2 sm:px-4">
            <div className="w-full max-w-6xl">
              <BazaarShowcasePlayer />
            </div>
          </div>
        </section> */}

        {/* Create in Horizontal, Vertical, Square with Morphing Section */}
        <section className="mt-16 w-full py-8 md:py-12 -mx-4 px-4 bg-gradient-to-b from-gray-50/50 to-white">
          <DynamicFormatTitle />
          
          {/* Aspect Ratio Transition Player */}
          <div className="flex justify-center w-full px-2 sm:px-4">
            <div className="w-full max-w-5xl">
              <AspectRatioTransitionPlayer />
            </div>
          </div>
        </section>

        {/* Homepage Templates Section */}
        <HomePageTemplatesSection marketingHeaderRef={marketingHeaderRef} />

        {/* Start Creating Now CTA Section (moved above AaaS promo) */}
        <section className="mt-8 py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            {status === "authenticated" && session?.user ? (
              <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
                <NewProjectButton
                  enableQuickCreate={true}
                  disableFormatDropdown={false}
                  className="!block !w-full !bg-white !px-6 md:!px-8 !py-3 md:!py-4 !rounded-lg !text-base md:!text-lg !font-semibold !shadow-none !hover:shadow-none !transform !hover:scale-[1.02] !transition-all !duration-200 !h-auto !border-none !cursor-pointer hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white focus:bg-gradient-to-r focus:from-pink-500 focus:to-orange-500 focus:text-white transition-colors !z-10 !relative"
                  variant="ghost"
                >
                  Start Creating Now
                </NewProjectButton>
              </div>
            ) : (
              <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
                <button
                  onClick={async () => {
                    if (tryForFreeLoading) return;
                    setTryForFreeLoading(true);
                    try {
                      await handleTryForFree();
                    } finally {
                      setTryForFreeLoading(false);
                    }
                  }}
                  disabled={tryForFreeLoading}
                  className="cursor-pointer inline-block bg-white px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg font-semibold shadow-none transform hover:scale-[1.02] transition-all duration-200 h-auto border-none hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white focus:bg-gradient-to-r focus:from-pink-500 focus:to-orange-500 focus:text-white transition-colors disabled:opacity-50"
                >
                  {tryForFreeLoading ? (
                    <svg className="animate-spin h-5 w-5 text-gray-900 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  ) : (
                    "Start Creating Now"
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* AaaS Promo Section */}
        <section className="mt-16 w-full py-12 -mx-4 px-4 bg-gradient-to-b from-white to-gray-50/60">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
              Too busy building your product?
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-8">
              Our team will craft the launch video your product deserves — scroll-stopping, on-brand and ready to post everywhere.
            </p>
            <div className="flex justify-center">
              <Link
                href="/animation-as-a-service"
                className="cursor-pointer inline-block bg-black text-white px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg font-semibold shadow-none hover:bg-gray-900 transition-colors"
              >
                learn more
              </Link>
            </div>
          </div>
        </section>

        

      </main>

      {/* Removed V2 announcement & video modal */}


      {/* Purchase Modal for homepage */}
      <PurchaseModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} />

      <style jsx global>{`
  .bazaar-gradient-hover {
    transition: background 0.3s, color 0.3s;
  }
  .bazaar-gradient-hover:hover {
    background: linear-gradient(90deg, #ec4899 0%, #f97316 100%) !important;
    color: #fff !important;
  }
`}</style>
    </div>
  );
}

function HomepageSuspenseFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <span className="text-sm text-gray-500">Loading homepage...</span>
    </div>
  );
}

export default function Homepage() {
  return (
    <Suspense fallback={<HomepageSuspenseFallback />}>
      <HomepageContent />
    </Suspense>
  );
}
