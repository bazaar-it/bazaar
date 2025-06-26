"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function EmailSubscriptionForm() {
  const [email, setEmail] = useState("");
  const [emailSubmitState, setEmailSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailErrorMessage, setEmailErrorMessage] = useState<string>('');

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

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || emailSubmitState === 'loading') return;
    
    setEmailSubmitState('loading');
    subscribeEmail.mutate({ 
      email: email.trim(),
      source: 'homepage' 
    });
  };

  return (
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
  );
}