// src/app/page.tsx
"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import LoginPage from "./login/page";

// Custom hook for typewriter effect
const useTypewriterPrompt = (
  staticPrefix: string, 
  prompts: string[], 
  typeSpeed = 50, 
  deleteSpeed = 30, 
  pauseTime = 2000
): string => {
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // If we're in the pause state
    if (isPaused) {
      timer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseTime);
      return () => clearTimeout(timer);
    }

    const currentPrompt = prompts[promptIndex] ?? '';
    
    // Handle deletion
    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentText(prev => prev.substring(0, prev.length - 1));
        if (currentText === '') {
          setIsDeleting(false);
          setPromptIndex((promptIndex + 1) % prompts.length);
        }
      }, deleteSpeed);
    } 
    // Handle typing
    else {
      if (currentText === currentPrompt) {
        setIsPaused(true);
      } else {
        timer = setTimeout(() => {
          setCurrentText(currentPrompt.substring(0, currentText.length + 1));
        }, typeSpeed);
      }
    }
    
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, promptIndex, isPaused, prompts, typeSpeed, deleteSpeed, pauseTime]);
  
  return staticPrefix + currentText;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [prompt, setPrompt] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const router = useRouter();
  const createProject = api.project.create.useMutation();
  
  // Example prompts for rotation
  const examplePrompts = [
    "a scene where bold white text saying 'Launch Day' pulses over a shifting pink-to-purple gradient with sparkles trailing off",
    "a scene with a dark terminal-style background and green monospaced code being typed out line-by-line, Matrix-style",
    "a product feature appearing one by one in 3D-style cards that fade in and float upward with a spring motion",
    "a scene that zooms into a phone screen while a hand scrolls through an app, with UI elements bouncing softly",
    "a typewriter-style text effect introducing 'Introducing FlowSync', with a glitch transition revealing the app logo",
    "a looping animation of fireworks exploding in sync with sound pulses on a midnight blue background",
    "a scene where 3 floating avatars rotate in 3D space while chat bubbles fade in above them",
    "a kinetic typography scene where the phrase 'Speed. Style. Simplicity.' slams onto the screen in sync with bass hits",
    "a scene with a sunrise horizon behind mountains, as the product name rises with the sun using smooth motion blur"
  ];
  
  // Rotating placeholder using the typewriter effect
  const placeholderText = useTypewriterPrompt("Create ", examplePrompts);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (status === "authenticated" && session?.user) {
      // Create project with initial prompt as message
      const project = await createProject.mutateAsync({
        initialMessage: prompt,
      });
      if (project?.projectId) {
        router.push(`/projects/${project.projectId}/edit`);
      }
    } else {
      setShowLogin(true);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This would connect to an API endpoint to store the email
    console.log("Email submitted:", email);
    // Reset form or show success message
    setEmail("");
    // Could add a toast notification or success message here
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
      answer: "During beta, it's completely free."
    },
    {
      id: "how-it-works",
      question: "How does it work?",
      answer: "Write a description of each scene you want to make and press \"Create.\" We'll generate the code. You can then refine every scene in the editor using natural language."
    },
    {
      id: "save",
      question: "How do I save it?",
      answer: "We haven't implemented that yet — but it's coming soon. For now, we recommend screen recording. Your scenes will be saved to your account and rendering/exporting will be available in the next few days. Make sure you're signed up for updates to know when it goes live."
    },
    {
      id: "mobile",
      question: "Can I make it in a mobile-friendly format?",
      answer: "Yes, just prompt the box to make it vertical, square, horizontal—whatever you want."
    },
    {
      id: "figma",
      question: "Can I import my Figma file?",
      answer: "That feature is coming soon. Enter your email below to get notified."
    },
    {
      id: "contact",
      question: "How can I contact you?",
      answer: "Email us at hello@bazaar.it."
    },
    {
      id: "what-is",
      question: "WTF is Bazaar?",
      answer: "Bazaar is a fine-tuned LLM for converting text descriptions into motion graphic videos."
    },
    {
      id: "music",
      question: "Can I add music?",
      answer: "That feature is coming soon."
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
          <p className="text-xl text-gray-600">Create stunning motion graphic scenes from a simple prompt</p>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto" autoComplete="off">
          <div className="relative">
            <textarea
              placeholder={placeholderText}
              aria-label="Video idea prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="w-full px-6 py-6 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-black min-h-[180px] resize-none pb-20"
              disabled={createProject.isPending}
              autoFocus
            />
            <button
              type="submit"
              className="absolute bottom-5 right-5 bg-black text-white px-6 py-3 rounded-md font-semibold hover:bg-gray-800 transition"
              disabled={createProject.isPending || !prompt.trim()}
            >
              {createProject.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
        
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
                    expandedFaq === faq.id ? 'max-h-60 py-4' : 'max-h-0 py-0'
                  }`}
                >
                  <p className="text-gray-600">{faq.answer}</p>
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition whitespace-nowrap"
            >
              Sign up
            </button>
          </form>
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