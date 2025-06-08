// src/app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { analytics } from "~/lib/analytics";

export default function LoginPage() {
  const handleGitHubLogin = () => {
    // Track OAuth login attempt
    analytics.userLogin('github');
    
    // Check if user came from Reddit
    const referralSource = sessionStorage.getItem('referral_source');
    if (referralSource === 'reddit') {
      analytics.betaUserSignup('reddit');
    }
    
    signIn("github", { callbackUrl: "/projects/new" });
  };

  const handleGoogleLogin = () => {
    // Track OAuth login attempt
    analytics.userLogin('google');
    
    // Check if user came from Reddit
    const referralSource = sessionStorage.getItem('referral_source');
    if (referralSource === 'reddit') {
      analytics.betaUserSignup('reddit');
    }
    
    signIn("google", { callbackUrl: "/projects/new" });
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 relative">
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">Sign in to Bazaar</h1>

      <div className="flex flex-col gap-4">
        <button
          onClick={handleGitHubLogin}
          className="flex w-full items-center justify-center gap-3 rounded-md bg-gray-900 py-2 px-4 text-white hover:bg-gray-700 transition"
        >
          <span className="flex items-center justify-center w-5 h-5">
            <GitHubIcon className="w-full h-full" />
          </span>
          Sign in with GitHub
        </button>

        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-md bg-blue-600 py-2 px-4 text-white hover:bg-blue-500 transition"
        >
          <span className="flex items-center justify-center w-5 h-5">
            <GoogleIcon className="w-full h-full" />
          </span>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

// GitHub logo SVG
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      width="24" 
      height="24"
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.016c0 4.428 2.865 8.186 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.34-3.369-1.34-.454-1.158-1.11-1.467-1.11-1.467-.908-.62.069-.608.069-.608 1.003.071 1.531 1.031 1.531 1.031.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.252-4.555-1.112-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.563 9.563 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.748-1.025 2.748-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.339 4.687-4.566 4.935.36.31.68.923.68 1.86 0 1.343-.012 2.426-.012 2.754 0 .269.18.58.688.482A10.025 10.025 0 0022 12.016C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Google logo SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 48 48"
      width="24" 
      height="24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5h-2.1V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8c1.8-3.5 5.4-6 9.6-6 3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.5 29.5 4 24 4c-7.4 0-13.7 4-17.7 10.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.4c-2 1.5-4.5 2.4-7.6 2.4-5.2 0-9.6-3.3-11.3-8H6.3c3.6 7.1 11 12 19.7 12z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5h-2.1V20H24v8h11.3c-.7 2.1-2 4-3.7 5.5l.1.1 6.5 5.4c-.5.5 1.1-.8 1.6-1.3 2.6-2.8 4.3-6.6 4.3-10.7 0-1.3-.1-2.7-.4-4z"
      />
    </svg>
  );
} 