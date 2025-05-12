//src/components/CustomComponentStatus.tsx
import React, { useEffect, useRef } from "react";

// Note: Replace these imports with the actual paths in your project
// Assuming api utility is located at ~/lib/api or similar
import { api } from "~/trpc/react";

// Import Spinner from your UI components
const Spinner = ({ className }: { className?: string }) => (
  <div className={`animate-spin ${className || ''}`}>
    {/* Simple spinner fallback */}
    ⟳
  </div>
);

interface CustomComponentStatusProps {
  componentId: string;
  onSuccess?: (outputUrl: string) => void;
  onStatusChange?: (status: string, outputUrl?: string) => void; // New callback for any status change
  collapsed?: boolean; // Optional prop to show condensed view
}

/**
 * Component for displaying the status of a custom component job
 * 
 * Shows loading states, success, or error messages depending on the job status.
 * Can trigger a callback when a job completes successfully.
 * 
 * @param componentId UUID of the custom component job
 * @param onSuccess Optional callback for when the job succeeds
 * @param onStatusChange Optional callback for any status change
 * @param collapsed Whether to show a condensed view (for sidebar)
 */
export function CustomComponentStatus({ 
  componentId, 
  onSuccess,
  onStatusChange,
  collapsed
}: CustomComponentStatusProps) {
  // Keep track of previous status and outputUrl to prevent unnecessary callbacks
  const prevStatusRef = useRef<string | null>(null);
  const prevOutputUrlRef = useRef<string | null>(null);
  
  // Keep a ref to track if we need polling (only for pending/building)
  const shouldPollRef = useRef<boolean>(true);
  const errorCountRef = useRef<number>(0);
  
  // Query the job status with smarter polling logic
  const { data: job, isLoading, error } = api.customComponent.getJobStatus.useQuery(
    { id: componentId },
    { 
      // Only poll if the job is in a non-terminal state
      refetchInterval: shouldPollRef.current ? 2000 : false,
      refetchIntervalInBackground: false, // Don't poll when tab is inactive
      enabled: !!componentId,
      // Don't retry indefinitely on error
      retry: (failureCount, error) => {
        // Only retry up to 3 times for DB connection errors
        if (error.message?.includes('connecting to database') && failureCount < 3) {
          return true;
        }
        return false;
      },
      // Don't keep invalid data in the cache too long
      staleTime: 30000
    }
  );

  // Update polling strategy based on job status
  useEffect(() => {
    if (!job) return;
    
    // Only poll for pending/building jobs - terminal states don't need polling
    shouldPollRef.current = ['pending', 'building'].includes(job.status);
    
    // Reset error counter when we get a successful response
    errorCountRef.current = 0;
  }, [job]);

  // Instead, log errors in useEffect
  useEffect(() => {
    if (error) {
      errorCountRef.current += 1;
      // Only log the first few errors to avoid spam
      if (errorCountRef.current <= 3) {
        console.error(`Error fetching component status: ${error.message}`);
      }
    }
  }, [error]);

  // Call the callbacks when the job status changes
  useEffect(() => {
    if (!job || !job.status) return;
    
    // Convert null to undefined for the outputUrl parameter
    const outputUrl = job.outputUrl || undefined;
    
    // Only call callbacks if status or outputUrl actually changed
    const statusChanged = prevStatusRef.current !== job.status;
    const outputUrlChanged = prevOutputUrlRef.current !== job.outputUrl;
    
    if (statusChanged || outputUrlChanged) {
      // Update refs with current values
      prevStatusRef.current = job.status;
      prevOutputUrlRef.current = job.outputUrl;
      
      // Call status change callback for any status
      if (onStatusChange) {
        onStatusChange(job.status, outputUrl);
      }
      
      // Call success callback specifically for successful jobs
      // Note: Job status can be either "success" (old) or "complete" (new standard)
      if ((job.status === "success" || job.status === "complete") && job.outputUrl && onSuccess) {
        onSuccess(job.outputUrl);
      }
    }
  }, [job, onSuccess, onStatusChange]);

  // Handle error states
  if (error) {
    return (
      <div className="text-red-500">
        <span className="text-xs">❌ Status unavailable</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Spinner className="h-4 w-4" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }
  
  if (!job || !job.status) {
    return (
      <div className="text-red-500">
        <span className="text-xs">❌ Not found</span>
      </div>
    );
  }
  
  // Render different UI based on status
  switch (job.status) {
    case "pending":
      return (
        <div className="flex items-center gap-1 text-amber-500">
          <Spinner className="h-3 w-3" />
          <span className="text-xs">Queued</span>
        </div>
      );
    case "building":
      return (
        <div className="flex items-center gap-1 text-blue-500">
          <Spinner className="h-3 w-3" />
          <span className="text-xs">Building</span>
        </div>
      );
    case "success":
    case "complete": // Handle both "success" (old) and "complete" (new standard)
      return (
        <div className="text-green-500 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span className="text-xs">Ready</span>
        </div>
      );
    case "error":
      return (
        <div className="text-red-500">
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span className="text-xs">Error</span>
          </div>
          {job.errorMessage && !collapsed && (
            <div className="mt-1 text-xs bg-red-50 p-1 rounded-md border border-red-200 max-w-[200px] truncate">
              {job.errorMessage}
            </div>
          )}
        </div>
      );
    default:
      return <div className="text-xs">Unknown: {job.status}</div>;
  }
}
