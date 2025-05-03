//src/components/CustomComponentStatus.tsx
import React, { useEffect } from "react";

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
}

/**
 * Component for displaying the status of a custom component job
 * 
 * Shows loading states, success, or error messages depending on the job status.
 * Can trigger a callback when a job completes successfully.
 * 
 * @param componentId UUID of the custom component job
 * @param onSuccess Optional callback for when the job succeeds
 */
export function CustomComponentStatus({ 
  componentId, 
  onSuccess 
}: CustomComponentStatusProps) {
  // Query the job status with polling for pending/building jobs
  const { data: job, isLoading } = api.customComponent.getJobStatus.useQuery(
    { id: componentId },
    { 
      // Poll every 2 seconds for pending/building jobs, stop polling otherwise
      refetchInterval: 2000,
      refetchIntervalInBackground: true,
      enabled: !!componentId,
    }
  );

  // Call the success callback when the job completes
  useEffect(() => {
    if (job?.status === "success" && job.outputUrl && onSuccess) {
      onSuccess(job.outputUrl);
    }
  }, [job, onSuccess]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Spinner className="h-4 w-4" />
        <span>Checking component status...</span>
      </div>
    );
  }
  
  if (!job) {
    return (
      <div className="text-red-500">
        ❌ Component not found
      </div>
    );
  }
  
  switch (job.status) {
    case "pending":
      return (
        <div className="flex items-center gap-2 text-amber-500">
          <Spinner className="h-4 w-4" />
          <span>Waiting in queue...</span>
        </div>
      );
    case "building":
      return (
        <div className="flex items-center gap-2 text-blue-500">
          <Spinner className="h-4 w-4" />
          <span>Building your custom component...</span>
        </div>
      );
    case "success":
      return (
        <div className="text-green-500 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Custom component ready</span>
        </div>
      );
    case "error":
      return (
        <div className="text-red-500">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span>Error building component</span>
          </div>
          {job.errorMessage && (
            <div className="mt-1 text-sm bg-red-50 p-2 rounded-md border border-red-200">
              {job.errorMessage}
            </div>
          )}
        </div>
      );
    default:
      return <div>Unknown status: {job.status}</div>;
  }
}
