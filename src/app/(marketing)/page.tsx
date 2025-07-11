// src/app/page.tsx
"use client";
import Image from "next/image";
import { useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { NewProjectButton } from "~/components/client/NewProjectButton";
import RemotionVideoPlayer from "~/components/RemotionVideoPlayer";
import { BazaarStickyScroll } from "~/components/BazaarStickyScroll";

// Lazy load heavy components
const LoginModal = lazy(() => import("./login/page"));
const EmailSubscriptionForm = dynamic(() => import("~/components/marketing/EmailSubscriptionForm"), { ssr: false });



export default function HomePage() {
  const { data: session, status } = useSession();
  const [showLogin, setShowLogin] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  // State for login modal only
  // removed mounted state to render immediately
  const [intendedAction, setIntendedAction] = useState<'try-for-free' | null>(null);
  const router = useRouter();
  
  // Email subscription state (mutation moved to EmailSubscriptionForm component)
  const [emailSubmitState, setEmailSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailErrorMessage, setEmailErrorMessage] = useState<string>('');
  // Removed - now handled in EmailSubscriptionForm component

  const handleTryForFree = async () => {
    if (status === "authenticated" && session?.user) {
      // User is logged in - the NewProjectButton will handle quick create with landscape format
      return;
    } else {
      setIntendedAction('try-for-free');
      setShowLogin(true);
    }
  };

  // Email submit handler moved to EmailSubscriptionForm component

  // Removed - now handled in FAQSection component

  // Example video cards data
  const exampleCards = [
    {
      prompt: "Create a line-by-line animation of code being generated",
      videoUrl: "https://dnauvvkfpmtquaysfdvm.supabase.co/storage/v1/object/public/animations//aiCoding.mp4",
    },
    {
      prompt: "Create a prompt input box with type writer effect",
      videoUrl: "https://dnauvvkfpmtquaysfdvm.supabase.co/storage/v1/object/public/animations//Prompt%20input.mp4",
    },
    {
      prompt: "Create exploding fireworks",
      videoUrl: "https://dnauvvkfpmtquaysfdvm.supabase.co/storage/v1/object/public/animations//firework.mp4",
    },
  ];





  return (
    <div className="min-h-screen bg-white flex flex-col animate-fade-in">
      {/* Header */}
      <header className="w-full h-20 border-b shadow-sm flex items-center px-12 justify-between bg-white z-10">
        <div className="flex items-end gap-2">
          <div className="flex items-baseline gap-2 font-inter">
            <span className="text-3xl font-semibold text-black">Bazaar</span>
            <span className="text-base font-medium text-gray-600">V3</span>
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 max-w-6xl mx-auto w-full">
        {/* Announcement Banner */}
        <div className="w-full mb-8 flex justify-center">
          <div className="inline-flex items-center gap-3 bg-gray-100 py-2 px-3 rounded-full">
            <span className="bg-black text-white px-3 py-1 rounded-full text-sm font-medium">
              V3 is Live!
            </span>
            <button 
              onClick={() => setShowVideo(true)}
              className="text-gray-900 hover:text-gray-700 font-medium text-sm underline transition-colors"
            >
                                Watch the video
            </button>
          </div>
        </div>
        
        <div className="mb-16 w-full text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">Screenshot to Demo Video - in seconds.</h1>
          <p className="text-xl text-gray-600">Bazaar is an AI video generator that turns prompts into motion graphic videos</p>
        </div>
        
        <div className="w-full text-center">
          {status === "authenticated" && session?.user ? (
            <NewProjectButton
              enableQuickCreate={true}
              disableFormatDropdown={true}
              className="!inline-block !bg-black !text-white !px-10 !py-5 !rounded-lg !text-lg !font-semibold !hover:bg-gray-800 !shadow-lg !hover:shadow-xl !transform !hover:scale-[1.02] !transition-all !duration-200 !h-auto !border-none"
              variant="ghost"
            >
              Try for Free
            </NewProjectButton>
          ) : (
            <button
              onClick={handleTryForFree}
              disabled={false}
              className="inline-block bg-black text-white px-10 py-5 rounded-lg text-lg font-semibold hover:bg-gray-800 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
            >
              Try for Free
            </button>
          )}
          <p className="text-center text-gray-500 text-sm mt-4">
            No credit card required
          </p>
        </div>
        
        {/* Example videos section */}
        <section className="mt-20 w-full">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Create entire videos from a single prompt</h2>
          
          {/* Remotion Video Player */}
          <div className="flex justify-center w-full">
            <div style={{ width: '70%' }}>
              <RemotionVideoPlayer />
            </div>
          </div>
        </section>

        {/* Sticky Scroll Features Section */}
        <section className="mt-24 w-full">
          <BazaarStickyScroll />
        </section>
      </main>

      {/* Email Sign-Up Section */}
      <Suspense fallback={<div className="w-full py-16 bg-gray-50" />}>
        <EmailSubscriptionForm />
      </Suspense>

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
    </div>
  );
}