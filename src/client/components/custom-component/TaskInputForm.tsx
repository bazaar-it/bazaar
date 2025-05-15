//src/client/components/custom-component/TaskInputForm.tsx

'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/input';
import { createTextMessage } from '~/types/a2a';

interface TaskInputFormProps {
  taskId: string;
  prompt?: string;
  onSubmitComplete?: () => void;
  onCancel?: () => void;
}

/**
 * Component for submitting user input when a task enters the input-required state
 * 
 * This component provides a form for users to respond to agent questions or prompts
 * and submit their input back to the task.
 */
export function TaskInputForm({
  taskId,
  prompt,
  onSubmitComplete,
  onCancel
}: TaskInputFormProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the mutation for submitting task input
  const submitTaskInputMutation = api.a2a.submitTaskInput.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setInput('');
      onSubmitComplete?.();
    },
    onError: (error) => {
      setIsSubmitting(false);
      setError(error.message);
    }
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create a text message from the input
      const message = createTextMessage(input.trim());
      
      // Submit the input to the task
      await submitTaskInputMutation.mutateAsync({
        taskId,
        message
      });
    } catch (err) {
      // Error is handled by the mutation callbacks
    }
  };

  return (
    <div className="border rounded-md p-4 bg-white dark:bg-gray-800 shadow-sm">
      <div className="mb-4">
        <h3 className="font-medium text-sm mb-2">Input Required</h3>
        {prompt && (
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            {prompt}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your response..."
            className="w-full mb-3 min-h-[100px]"
          />
          {error && (
            <div className="text-sm text-red-500 mb-3">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!input.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : 'Submit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
