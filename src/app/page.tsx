// src/app/page.tsx
"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import LoginPage from "./login/page";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [prompt, setPrompt] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const router = useRouter();
  const createProject = api.project.create.useMutation();

  // Track whether the page has loaded for animations
  const [isLoaded, setIsLoaded] = useState(false);

  // Set page as loaded after mounting - corrected useEffect
  useEffect(() => {
    setIsLoaded(true);
    // Return cleanup function or nothing
    return () => {};
  }, []);

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="w-full h-20 border-b shadow-sm flex items-center px-12 justify-between bg-white z-10">
        <div className="flex items-center gap-4">
          <Image src="/bazaar-logo.png" alt="Bazaar" width={90} height={24} priority className={`transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} />
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

      {/* Hero Section with Gradient Background */}
      <div className="w-full bg-gradient-to-r from-blue-50 via-white to-purple-50 py-24">
        <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-5xl mx-auto">
          <div className={`w-full text-center mb-12 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-black to-gray-800">
              Prompt to Video in seconds.
            </h1>
            <p className="text-2xl text-gray-600 mt-6">3D Product Design - Made Simple.</p>
          </div>
          
          <form onSubmit={handleSubmit} className={`w-full max-w-3xl mb-16 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} autoComplete="off">
            <div className="relative shadow-lg rounded-xl hover:shadow-xl transition-shadow duration-300">
              <input
                type="text"
                placeholder="Describe what you want to create in detail... e.g., A shell shaped sofa for 1-2 people made from bamboo with a white cushion."
                aria-label="Video description prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full px-8 py-7 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-lg transition-all duration-300 focus:border-blue-300"
                disabled={createProject.isPending}
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition shadow-md hover:scale-105 duration-300 active:scale-95"
                disabled={createProject.isPending || !prompt.trim()}
              >
                {createProject.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </main>
      </div>

      {/* How It Works Section with Visual Elements and Animations */}
      <div className="w-full py-24 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 animate-fade-in">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center p-6 rounded-2xl hover:shadow-lg transition-all duration-500 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center font-bold text-2xl mb-6 transition-transform duration-500 hover:scale-110">1</div>
              <h3 className="text-2xl font-semibold mb-4">Describe your product</h3>
              <p className="text-center text-gray-600 text-lg">Type a few lines about what your app does, and which features you want to highlight.</p>
              <div className="mt-6 w-16 h-1 bg-black rounded-full transition-all duration-300 group-hover:w-24"></div>
            </div>
            
            <div className="flex flex-col items-center p-6 rounded-2xl hover:shadow-lg transition-all duration-500 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center font-bold text-2xl mb-6 transition-transform duration-500 hover:scale-110">2</div>
              <h3 className="text-2xl font-semibold mb-4">Bazaar builds the scenes</h3>
              <p className="text-center text-gray-600 text-lg">Our AI generates a fully animated demo — UI flows, text overlays, transitions, and music.</p>
              <div className="mt-6 w-16 h-1 bg-black rounded-full transition-all duration-300 group-hover:w-24"></div>
            </div>
            
            <div className="flex flex-col items-center p-6 rounded-2xl hover:shadow-lg transition-all duration-500 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center font-bold text-2xl mb-6 transition-transform duration-500 hover:scale-110">3</div>
              <h3 className="text-2xl font-semibold mb-4">Refine with text</h3>
              <p className="text-center text-gray-600 text-lg">Want to change something? Just tell Bazaar. "Make it faster," "Add a slide-in," "Highlight the dashboard" — done.</p>
              <div className="mt-6 w-16 h-1 bg-black rounded-full transition-all duration-300 group-hover:w-24"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section with Animation */}
      <div className="w-full py-20 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-6 animate-fade-in">Ready to create your first video?</h2>
          <p className="text-xl text-gray-600 mb-10">Transform your ideas into compelling videos with just a few clicks.</p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-8 py-4 bg-black text-white text-lg font-semibold rounded-xl hover:bg-gray-800 transition shadow-md hover:scale-105 duration-300 active:scale-95 animate-pulse-subtle"
          >
            Get Started Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-8 border-t">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Image src="/bazaar-logo.png" alt="Bazaar" width={60} height={15} className="drop-shadow-sm" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Bazaar. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Login Modal Overlay */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-0 overflow-hidden w-full max-w-md animate-scale-in">
            <LoginPage />
            <button className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors" onClick={() => setShowLogin(false)}>&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}