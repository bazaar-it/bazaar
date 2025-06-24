// src/app/page.tsx
"use client";
import Image from "next/image";
import { useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

// Lazy load heavy components
const LoginModal = lazy(() => import("./login/page"));
const EmailSubscriptionForm = dynamic(() => import("~/components/marketing/EmailSubscriptionForm"), { ssr: false });
const FAQSection = dynamic(() => import("~/components/marketing/FAQSection"), { ssr: false });



export default function HomePage() {
  const { data: session, status } = useSession();
  const [showLogin, setShowLogin] = useState(false);
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
      // Redirect to /projects/new which handles idempotent project creation
      // This ensures we don't create duplicate projects on multiple clicks
      router.push('/projects/new');
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

  // FAQ data
  const faqs = [
    {
      id: "cost",
      question: "How much does it cost?",
      answer: "Bazaar is free with unlimited use during the beta testing period."
    },
    {
      id: "how-it-works",
      question: "How does it work?",
      answer: "You type a single scene description, and we turn it into a motion graphic video in about 7 seconds.\n\nBehind the scenes, we use AI to generate React code based on your prompt, and then render it using Remotion. The more descriptive you are, the better the results — so don't hold back. Mention colors, fonts, sizes, layout, movement, and any other visual details you imagine.\n\nPut simply: clear input = great output.\nVague input? Not so much."
    },
    {
      id: "what-is",
      question: "What is Bazaar?",
      answer: "Our long term vision for Bazaar is to build a tool that turns code into content and enables storytelling at scale.\n\nNo timelines. No editing. Just emotional, accurate, and visually captivating video - for every feature, in every language, tailored to every customer."
    },
    {
      id: "beta-features",
      question: "What features are in Beta V1?",
      answer: "Beta V1 is our very first release — a primitive but promising text-to-motion generator.\n\nFrom a single text prompt, you can generate short, animated scenes. You can iterate on each either by describing the change you want to make or by opening the code panel, editing it and clicking 'Run'.\n\nVideo downloads aren't supported yet, so you'll need to screen record your masterpiece for now.\n\nYour scenes are saved to your account, but you won't be able to view or manage them just yet — that feature's coming soon."
    },
    {
      id: "new-features",
      question: "What new features are you working on?",
      answer: "While we have an ambitious vision for fully automated video generation, our AI isn't there yet — so we're building the foundation in the meantime.\n\nRight now, we're working on a fully featured editor where you can create multi-scene videos from a single prompt, add music, and save your work properly. You'll be able to stitch scenes together, fine-tune timing, and build more complete product demos.\n\nBehind the scenes, we're training our AI to go from a single prompt to an entire software demo — but we've still got a lot of work to get there."
    }
  ];

  // Company logos for credibility section
  const companyLogos = [
    { name: "Google", path: "https://egvuknlirjkhhhoooecl.supabase.co/storage/v1/object/public/bazaar-vid//Format=Wordmark.svg" },
    { name: "Adobe", path: "https://egvuknlirjkhhhoooecl.supabase.co/storage/v1/object/public/bazaar-vid//Adobe.svg" },
    { name: "Uber", path: "https://egvuknlirjkhhhoooecl.supabase.co/storage/v1/object/public/bazaar-vid//Uber.svg" },
    { name: "Airbnb", path: "https://egvuknlirjkhhhoooecl.supabase.co/storage/v1/object/public/bazaar-vid//Airbnb.svg" },
    { name: "Github", path: "https://egvuknlirjkhhhoooecl.supabase.co/storage/v1/object/public/bazaar-vid//Github.svg" },
    { name: "Netflix", path: "https://egvuknlirjkhhhoooecl.supabase.co/storage/v1/object/public/bazaar-vid//netflix.svg" },
    { name: "Slack", path: "https://egvuknlirjkhhhoooecl.supabase.co/storage/v1/object/public/bazaar-vid//slack.svg" },
    { name: "Twilio", path: "https://egvuknlirjkhhhoooecl.supabase.co/storage/v1/object/public/bazaar-vid//twilio.svg" },
    { name: "Vercel", path: "https://egvuknlirjkhhhoooecl.supabase.co/storage/v1/object/public/bazaar-vid//Vercel.svg" },
  ];

  // Auto-redirect logged-in users to workspace
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      console.log("User is already logged in, redirecting to workspace...");
      // Use /projects/new which will redirect to most recent project if exists
      router.push("/projects/new");
    }
  }, [status, session, router]);

  // Handle loading states and redirects after all hooks
  if (status === "loading") {
     return null; // Prevent hydration mismatch
   }

  return (
    <div className="min-h-screen bg-white flex flex-col animate-fade-in">
      {/* Header */}
      <header className="w-full h-20 border-b shadow-sm flex items-center px-12 justify-between bg-white z-10">
        <div className="flex items-end gap-2">
          <Image 
            src="https://egvuknlirjkhhhoooecl.supabase.co/storage/v1/object/public/bazaar-vid//Bazaar%20BETA%20V1.png" 
            alt="Bazaar Logo" 
            width={120} 
            height={120} 
            priority 
          />
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
        <div className="mb-16 w-full text-center">
          <h1 className="text-6xl font-extrabold mb-6 animate-slide-up">Motion Graphics, Made Simple</h1>
          <p className="text-xl text-gray-600">Bazaar is an AI-powered video generator that turns descriptions into animated motion graphics — in seconds.</p>
        </div>
        
        <div className="w-full text-center">
          <button
            onClick={handleTryForFree}
            disabled={false}
            className="inline-block bg-black text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 animate-pop-in"
          >
            Try for $0.00
          </button>
          <p className="text-center text-gray-500 text-sm mt-3">
            No credit card required • Start creating in seconds
          </p>
        </div>
        
        {/* Example videos section */}
        <section className="mt-20 w-full">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Create anything</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {exampleCards.map((card, index) => (
              <div key={index} className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                {/* card content will follow */}
              
                <div className="aspect-video w-full bg-black overflow-hidden">
                  <video
                    src={card.videoUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center mb-2">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <p className="ml-2 text-sm font-medium text-gray-400">Prompt</p>
                  </div>
                  <h3 className="font-medium text-base text-gray-900">
                    "{card.prompt}"
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* How it Works Section */}
        <section className="mt-24 w-full">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How it Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16 max-w-7xl mx-auto px-4">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up" style={{ animationDelay: '0ms' }}>
              <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold mb-6">1</div>
              <h3 className="text-xl font-semibold mb-4">Describe</h3>
              <p className="text-gray-600">Describe exactly what you want to create in a scene — the more detail the better</p>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold mb-6">2</div>
              <h3 className="text-xl font-semibold mb-4">Generate</h3>
              <p className="text-gray-600">Generate motion graphics instantly with AI.</p>
            </div>
            
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold mb-6">3</div>
              <h3 className="text-xl font-semibold mb-4">Refine</h3>
              <p className="text-gray-600">Refine each scene using natural language prompts — iterate until it's perfect.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Full width credibility section with auto-scrolling logos */}
      <section className="w-full py-16 bg-gray-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Used by teams at:</h2>
        </div>

        <style jsx global>{`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
        `}</style>

        <div className="relative w-full">
          <div className="overflow-hidden w-full whitespace-nowrap">
            <div className="inline-block animate-[scroll_25s_linear_infinite]">
              {companyLogos.map((logo) => (
                <div key={`first-${logo.name}`} className="inline-block mx-8 align-middle">
                  <div className="w-48 h-16 relative flex items-center justify-center">
                    <Image
                      src={logo.path}
                      alt={`${logo.name} logo`}
                      width={192}
                      height={72}
                      style={{ objectFit: 'contain' }}
                      className="max-h-16 w-auto grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="inline-block animate-[scroll_25s_linear_infinite]">
              {companyLogos.map((logo) => (
                <div key={`second-${logo.name}`} className="inline-block mx-8 align-middle">
                  <div className="w-48 h-16 relative flex items-center justify-center">
                    <Image
                      src={logo.path}
                      alt={`${logo.name} logo`}
                      width={192}
                      height={72}
                      style={{ objectFit: 'contain' }}
                      className="max-h-16 w-auto grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <Suspense fallback={<div className="w-full py-24 bg-white" />}>
        <FAQSection faqs={faqs} />
      </Suspense>

      {/* Email Sign-Up Section */}
      <Suspense fallback={<div className="w-full py-16 bg-gray-50" />}>
        <EmailSubscriptionForm />
      </Suspense>

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
              <LoginModal redirectTo='/projects/new' />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}