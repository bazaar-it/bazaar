// src/components/ui/FeedbackModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Input } from '~/components/ui/input';
import { Checkbox } from '~/components/ui/checkbox';
import { Label } from '~/components/ui/label';
import { X } from 'lucide-react';
import { feedbackFeatureOptions, type FeedbackFeatureOption } from '~/config/feedbackFeatures';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { AppRouter } from '~/server/api/root';

interface FeedbackModalProps {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
    } else {
      // Reset if user logs out while modal might be open or cached
      setName('');
      setEmail('');
    }
  }, [session]);

  const handleFeatureChange = (featureId: string) => {
    setSelectedFeatures(prev => ({ ...prev, [featureId]: !prev[featureId] }));
  };

  const submitFeedbackMutation = api.feedback.submit.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      setIsSubmitting(false);
      setFeedback(''); // Clear form
      setSelectedFeatures({}); // Clear selections
      // Name and email are intentionally not cleared here if user is logged in
      // For anonymous, they might want to submit another feedback with same details
      setTimeout(() => {
        onClose();
        setIsSubmitted(false); // Reset for next time modal opens
      }, 3000); // Longer delay to read thank you message
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error('Feedback submission error:', error);
      setIsSubmitting(false);
      // Optionally show an error message to the user, e.g., using a toast notification
      alert(`Error submitting feedback: ${error.message}`);
    }
  });

  const handleSubmit = () => {
    const prioritized = Object.entries(selectedFeatures)
      .filter(([,isSelected]) => isSelected)
      .map(([featureId]) => featureId);

    if (!feedback.trim() && prioritized.length === 0) {
      alert('Please select at least one feature to prioritize or provide some comments.');
      return;
    }

    setIsSubmitting(true);
    // Assuming 'prioritized' is already defined in the scope from user's previous changes
    // or that selectedFeatures should be processed here directly.
    // For now, let's process selectedFeatures directly here to avoid redeclaration error.
    const currentPrioritizedFeatures = Object.entries(selectedFeatures)
      .filter(([, value]) => value)
      .map(([key]) => key);

    const payload = {
      name: name.trim() || undefined,
      email: email.trim() || undefined, // Backend schema allows empty string, will be treated as undefined if so
      content: feedback.trim() || undefined,
      prioritizedFeatures: currentPrioritizedFeatures.length > 0 ? currentPrioritizedFeatures : undefined,
    };
    submitFeedbackMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Close feedback form"
        >
          <X size={20} />
        </button>

        {isSubmitted ? (
          <div className="text-center py-10">
            <h3 className="text-xl sm:text-2xl font-semibold text-green-600 dark:text-green-400">Thank you for your feedback!</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Your input helps us improve Bazaar.</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100">We'd Love Your Feedback</h2>

            <div className="mb-6 p-4 bg-sky-50 dark:bg-sky-900/50 border border-sky-200 dark:border-sky-700 rounded-md">
              <h3 className="text-md font-medium text-sky-800 dark:text-sky-200">Help us prioritize!</h3>
              <p className="text-sm text-sky-700 dark:text-sky-300 mb-3">What features are most important to you?</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {feedbackFeatureOptions.map((feature: FeedbackFeatureOption) => (
                  <div key={feature.id} className="flex items-center space-x-3">
                    <Checkbox 
                      id={`feature-${feature.id}`} 
                      checked={selectedFeatures[feature.id] || false} 
                      onCheckedChange={() => handleFeatureChange(feature.id)}
                      className="shrink-0"
                    />
                    <Label htmlFor={`feature-${feature.id}`} className="text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer">
                      {feature.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name {session?.user?.name ? '' : '(Optional)'}
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="mt-1 block w-full bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                  disabled={!!session?.user?.name} // Pre-fill and disable if user has a name in session
                />
              </div>

              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email {session?.user?.email ? '' : '(Optional)'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1 block w-full bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                  disabled={!!session?.user?.email} // Pre-fill and disable if user has an email in session
                />
              </div>

              <div>
                <Label htmlFor="feedback" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Additional Comments {(!feedback.trim() && Object.values(selectedFeatures).every(v => !v)) ? '' : '(Optional)'}
                </Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
                  placeholder="Share your thoughts, other feature requests, or report issues..."
                  className="mt-1 block w-full bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (!feedback.trim() && Object.values(selectedFeatures).filter(Boolean).length === 0)}
                className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 transition-colors duration-150 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
