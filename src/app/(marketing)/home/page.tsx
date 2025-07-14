// src/app/(marketing)/home/page.tsx
"use client";
import Image from "next/image";
import { useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { NewProjectButton } from "~/components/client/NewProjectButton";
import MarketingVideoPlayer from "~/components/MarketingVideoPlayer";
import GeneratingScenePlanPlayer from "~/components/GeneratingScenePlanPlayer";
import MarketingComponentPlayer from "~/components/MarketingComponentPlayer";
import TemplateScrollGrid from "~/components/TemplateScrollGrid";
import BazaarShowcasePlayer from "~/components/BazaarShowcasePlayer";
import AspectRatioTransitionPlayer from "~/components/AspectRatioTransitionPlayer";
import DynamicFormatTitle from "~/components/DynamicFormatTitle";
import ParticleEffect from "~/components/marketing/ParticleEffect";
// Lazy load heavy components
const LoginModal = lazy(() => import("../login/page"));


export default function NewHomePage() {
  const { data: session, status } = useSession();
  const [showLogin, setShowLogin] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [activeTab, setActiveTab] = useState<'graphs' | 'elements' | 'components'>('graphs');
  // State for login modal only
  // removed mounted state to render immediately
  const [intendedAction, setIntendedAction] = useState<'try-for-free' | null>(null);
  const router = useRouter();
  


  // Add loading state for unauthenticated Try for Free button
  const [tryForFreeLoading, setTryForFreeLoading] = useState(false);

  const handleTryForFree = async () => {
    if (status === "authenticated" && session?.user) {
      // User is logged in - the NewProjectButton will handle quick create with landscape format
      return;
    } else {
      setIntendedAction('try-for-free');
      setShowLogin(true);
    }
  };



  return (
    <div className="min-h-screen bg-white flex flex-col animate-fade-in">
      {/* Header */}
      <header className="w-full h-20 border-b shadow-sm flex items-center px-12 justify-between bg-white z-10">
        <div className="flex items-end gap-2">
          <div className="flex items-baseline gap-2 font-inter">
            <span className="text-3xl font-semibold text-black">Bazaar</span>
            <span className="text-base font-medium bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">V3</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {status === "authenticated" ? (
            <span className="text-base">Logged in as <b>{session.user?.name ?? session.user?.email}</b></span>
          ) : (
            <>
              <button className="text-base px-4 py-2 rounded hover:bg-gray-100 transition" onClick={() => setShowLogin(true)}>Login</button>
              <button className="text-base px-4 py-2 font-semibold rounded bg-black text-white hover:bg-gray-900 transition" onClick={() => setShowLogin(true)}>Sign Up</button>
            </>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-6xl mx-auto w-full relative overflow-hidden">
        {/* Advanced Floating Particles - Hero Section Only */}
        <ParticleEffect />

        {/* Announcement Banner */}
        <div className="w-full mb-8 flex justify-center">
          <div className="inline-flex items-center gap-3 bg-gray-100 py-2 px-3 rounded-full">
            <span className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              V3 is Live!
            </span>
            <button 
              onClick={() => setShowVideo(true)}
              className="text-pink-600 hover:text-pink-800 font-medium text-sm underline transition-colors"
            >
                                Watch the video
            </button>
          </div>
        </div>
        
        <div className="mb-16 w-full text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight text-gray-900">
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
          <p className="text-xl text-gray-600">Bazaar is an AI video generator for creating software demo videos.</p>
        </div>
        
        <div className="w-full text-center mb-0">
          {status === "authenticated" && session?.user ? (
            <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
              <NewProjectButton
                enableQuickCreate={true}
                disableFormatDropdown={false}
                className="!block !w-full !bg-white !px-8 !py-4 !rounded-lg !text-lg !font-semibold !shadow-none !hover:shadow-none !transform !hover:scale-[1.02] !transition-all !duration-200 !h-auto !border-none !cursor-pointer hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white focus:bg-gradient-to-r focus:from-pink-500 focus:to-orange-500 focus:text-white transition-colors !z-10 !relative"
                variant="ghost"
              >
                Start Creating Now
              </NewProjectButton>
            </div>
          ) : (
            <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
              <button
                onClick={async () => {
                  setTryForFreeLoading(true);
                  await handleTryForFree();
                  setTryForFreeLoading(false);
                }}
                disabled={tryForFreeLoading}
                className="inline-block bg-white px-6 py-3 rounded-lg text-lg font-semibold shadow-none transform hover:scale-[1.02] transition-all duration-200 h-auto border-none hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white focus:bg-gradient-to-r focus:from-pink-500 focus:to-orange-500 focus:text-white transition-colors"
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
          <p className="text-center text-gray-500 text-sm mt-2">
            No credit card required
          </p>
        </div>
        
        {/* Example videos section */}
        <section className="w-full -mt-20">
          {/* Marketing Video Player */}
          <div className="flex justify-center w-full">
            <div style={{ width: '95%' }}>
              <MarketingVideoPlayer />
            </div>
          </div>
        </section>

        {/* Create entire videos section */}
        <section className="mt-0 w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Create <span className="moving-gradient-text">entire videos</span> from a single prompt
            </h2>
          </div>
          
          {/* Generating Scene Plan Player */}
          <div className="flex justify-center w-full">
            <div style={{ width: '70%' }}>
              <GeneratingScenePlanPlayer />
            </div>
          </div>
        </section>

        {/* Prompt it to Perfection Section */}
        <section className="mt-32 w-full">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              <span className="relative inline-block">
                <span className="moving-gradient-text">Prompt</span>
              </span> it to Perfection
            </h2>
          </div>
          
          {/* Video Player */}
          <div className="flex justify-center w-full">
            <div style={{ width: '70%' }}>
              <MarketingComponentPlayer />
            </div>
          </div>
        </section>

        {/* Showcase of Three Bazaar Videos Section */}
        <section className="mt-16 w-full py-12 -mx-4 px-4 bg-gradient-to-b from-white to-gray-50/50">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Made with <span className="moving-gradient-text">Bazaar</span>
            </h2>
          </div>
          
          {/* Bazaar Showcase Player */}
          <div className="flex justify-center w-full">
            <div style={{ width: '80%' }}>
              <BazaarShowcasePlayer />
            </div>
          </div>
        </section>

        {/* Create in Horizontal, Vertical, Square with Morphing Section */}
        <section className="mt-16 w-full py-20 -mx-4 px-4 bg-gradient-to-b from-gray-50/50 to-white">
          <DynamicFormatTitle />
          
          {/* Aspect Ratio Transition Player */}
          <div className="flex justify-center w-full">
            <div style={{ width: '70%' }}>
              <AspectRatioTransitionPlayer />
            </div>
          </div>
        </section>

        {/* 50 Templates Section */}
        <section className="mt-16 w-full py-20 -mx-4 px-4 bg-gradient-to-b from-white to-pink-50/20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              50+ Templates to Start From
            </h2>
          </div>
          
          {/* Template Scroll Grid with Real Images */}
          <div className="mb-12">
            <TemplateScrollGrid />
          </div>
          
          {/* Start Creating Now Button */}
          <div className="text-center mt-5">
            {status === "authenticated" && session?.user ? (
              <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
                <NewProjectButton
                  enableQuickCreate={true}
                  disableFormatDropdown={false}
                  className="!inline-block !bg-white !px-8 !py-4 !rounded-lg !text-lg !font-semibold !shadow-none !hover:shadow-none !transform !hover:scale-[1.02] !transition-all !duration-200 !h-auto !border-none hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white focus:bg-gradient-to-r focus:from-pink-500 focus:to-orange-500 focus:text-white transition-colors"
                  variant="ghost"
                >
                  Start Creating Now
                </NewProjectButton>
              </div>
            ) : (
              <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
                <button
                  onClick={async () => {
                    setTryForFreeLoading(true);
                    await handleTryForFree();
                    setTryForFreeLoading(false);
                  }}
                  disabled={tryForFreeLoading}
                  className="inline-block bg-white px-6 py-3 rounded-lg text-lg font-semibold shadow-none transform hover:scale-[1.02] transition-all duration-200 h-auto border-none hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white focus:bg-gradient-to-r focus:from-pink-500 focus:to-orange-500 focus:text-white transition-colors"
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


      </main>



      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="relative w-full max-w-4xl mx-4">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" 
              onClick={() => setShowVideo(false)}
              aria-label="Close video"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/rfrYyb83zys?autoplay=1"
                title="Bazaar V3 Launch Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Login Modal Overlay - Updated to be more compact */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-auto max-w-sm relative">
            <button 
              className="absolute top-3 right-3 z-10 text-gray-500 hover:text-black w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" 
              onClick={() => setShowLogin(false)}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <Suspense fallback={<div className="p-8">Loading...</div>}>
              <LoginModal redirectTo='/projects/quick-create' />
            </Suspense>
          </div>
        </div>
      )}
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