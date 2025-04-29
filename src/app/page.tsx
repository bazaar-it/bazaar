// src/app/page.tsx
"use client";
import Image from "next/image";
import { useState } from "react";
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
          <Image src="/bazaar-logo.png" alt="Bazaar Logo" width={48} height={48} priority className="drop-shadow-md" />
          <span className="font-extrabold text-2xl tracking-tight text-black">Bazaar<span className="text-primary">.vid</span></span>
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
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <Image src="/bazaar-logo.png" alt="Bazaar Logo" width={96} height={96} priority className="mb-6 drop-shadow-lg" />
        <h1 className="text-4xl font-extrabold text-center mb-2">Prompt to Video in seconds.</h1>
        <p className="text-lg text-gray-600 mb-8 text-center">Describe your video idea – We'll generate it.</p>
        <form onSubmit={handleSubmit} className="w-full max-w-xl flex gap-2 mb-8" autoComplete="off">
          <input
            type="text"
            placeholder="Describe your video idea (e.g. 'A travel vlog intro with upbeat music')"
            aria-label="Video idea prompt"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-black"
            disabled={createProject.isPending}
            autoFocus
          />
          <button
            type="submit"
            className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
            disabled={createProject.isPending || !prompt.trim()}
          >
            {createProject.isPending ? "Creating..." : "Submit"}
          </button>
        </form>
        {/* (Optional) Example prompts could go here */}
      </main>

      {/* Login Modal Overlay */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-0 overflow-hidden w-full max-w-md">
            <LoginPage />
            <button className="absolute top-4 right-4 text-gray-500 hover:text-black" onClick={() => setShowLogin(false)}>&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}