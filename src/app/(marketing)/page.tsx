// src/app/page.tsx
"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import LoginPage from "./login/page";



export default function HomePage() {
  const { data: session, status } = useSession();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [emailSubmitState, setEmailSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailErrorMessage, setEmailErrorMessage] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const createProject = api.project.create.useMutation();
  
  // Email subscription mutation - MUST be before any conditional returns
  const subscribeEmail = api.emailSubscriber.subscribe.useMutation({
    onSuccess: (data) => {
      setEmailSubmitState('success');
      setEmailErrorMessage('');
      console.log(data.message);
      // Reset form after 3 seconds
      setTimeout(() => {
        setEmail("");
        setEmailSubmitState('idle');
      }, 3000);
    },
    onError: (error) => {
      setEmailSubmitState('error');
      setEmailErrorMessage(error.message || 'Failed to subscribe. Please try again later.');
      console.error("Email subscription error:", error.message);
      // Reset to idle after 5 seconds (longer for error messages)
      setTimeout(() => {
        setEmailSubmitState('idle');
        setEmailErrorMessage('');
      }, 5000);
    },
  });

  const handleTryForFree = async () => {
    if (status === "authenticated" && session?.user) {
      // Create a new project and redirect to generator
      const project = await createProject.mutateAsync({});
      if (project?.projectId) {
        router.push(`/projects/${project.projectId}/generate`);
      }
    } else {
      setShowLogin(true);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || emailSubmitState === 'loading') return;
    
    setEmailSubmitState('loading');
    subscribeEmail.mutate({ 
      email: email.trim(),
      source: 'homepage' 
    });
  };

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

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

  // Set mounted state to handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-redirect logged-in users to workspace
  useEffect(() => {
    if (mounted && status === "authenticated" && session?.user) {
      console.log("User is already logged in, redirecting to workspace...");
      router.push("/projects");
    }
  }, [mounted, status, session, router]);

  // Handle loading states and redirects after all hooks
  if (!mounted || status === "loading") {
    return null; // Prevent hydration mismatch
  }

  if (status === "authenticated" && session?.user) {
    return null; // Redirecting via useEffect
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
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
          <h1 className="text-6xl font-extrabold mb-6">Motion Graphics, Made Simple</h1>
          <p className="text-xl text-gray-600">Bazaar is an AI-powered video generator that turns descriptions into animated motion graphics — in seconds.</p>
        </div>
        
        <div className="w-full text-center">
          <button
            onClick={handleTryForFree}
            disabled={createProject.isPending}
            className="inline-block bg-black text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
          >
            {createProject.isPending ? "Creating..." : "Try for Free"}
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
              <div key={index} className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-[1.02] hover:shadow-xl">
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
            <div className="flex flex-col items-center text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold mb-6">1</div>
              <h3 className="text-xl font-semibold mb-4">Describe</h3>
              <p className="text-gray-600">Describe exactly what you want to create in a scene — the more detail the better</p>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold mb-6">2</div>
              <h3 className="text-xl font-semibold mb-4">Generate</h3>
              <p className="text-gray-600">Generate motion graphics instantly with AI.</p>
            </div>
            
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
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
      <section className="w-full py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 flex items-center justify-center gap-3">
            <span className="text-2xl">📚</span> FAQs
          </h2>
          
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div 
                key={faq.id} 
                className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
                >
                  <span className="font-medium text-lg">{faq.question}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`transition-transform duration-200 ${expandedFaq === faq.id ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedFaq === faq.id ? 'max-h-96 py-4' : 'max-h-0 py-0'
                  }`}
                >
                  <div className="text-gray-600 space-y-3">
                    {faq.answer.split('\n\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Email Sign-Up Section */}
      <section className="w-full py-16 bg-gray-50">
        <div className="max-w-lg mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-8 flex items-center justify-center gap-3">
            <span className="text-2xl">✉️</span> Sign up for updates
          </h2>
          
          <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 mb-3">
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              disabled={emailSubmitState === 'loading' || emailSubmitState === 'success'}
            />
            <button
              type="submit"
              disabled={emailSubmitState === 'loading' || emailSubmitState === 'success' || !email.trim()}
              className={`px-6 py-3 font-semibold rounded-lg transition whitespace-nowrap min-w-[100px] flex items-center justify-center gap-2 ${
                emailSubmitState === 'success' 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : emailSubmitState === 'error'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-black text-white hover:bg-gray-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {emailSubmitState === 'loading' && (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              )}
              {emailSubmitState === 'success' && (
                <>
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Success!
                </>
              )}
              {emailSubmitState === 'error' && (
                <>
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Try Again
                </>
              )}
              {emailSubmitState === 'idle' && 'Sign up'}
            </button>
          </form>
          {/* Error message display */}
          {emailSubmitState === 'error' && emailErrorMessage && (
            <div className="mt-2 text-sm text-red-600 text-center">
              {emailErrorMessage}
            </div>
          )}
          <p className="text-sm text-gray-500">
            Be the first to know when new features launch.
          </p>
        </div>
      </section>

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
            <LoginPage />
          </div>
        </div>
      )}
    </div>
  );
}