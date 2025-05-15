// src/client/components/a2a/TaskStatusBadge.tsx

'use client';

import { type TaskStatus } from '~/types/a2a';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';

interface TaskStatusBadgeProps {
  status: TaskStatus | null;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  className?: string;
}

/**
 * Component to display task status as a badge
 */
export function TaskStatusBadge({
  status,
  isLoading = false,
  onRefresh,
  className,
}: TaskStatusBadgeProps) {
  // Handle loading state
  if (isLoading || !status) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-600 ${className || ''}`}>
        <Spinner size="xs" />
        <span>Loading...</span>
      </div>
    );
  }

  // Get badge color based on status
  const getBadgeStyles = () => {
    switch (status.state) {
      case 'submitted':
        return 'bg-blue-100 text-blue-700';
      case 'working':
        return 'bg-yellow-100 text-yellow-700';
      case 'input-required':
        return 'bg-purple-100 text-purple-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'canceled':
        return 'bg-gray-100 text-gray-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Get human-readable status label
  const getStatusLabel = () => {
    switch (status.state) {
      case 'submitted':
        return 'Submitted';
      case 'working':
        return 'In Progress';
      case 'input-required':
        return 'Input Required';
      case 'completed':
        return 'Completed';
      case 'canceled':
        return 'Canceled';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className || ''}`}>
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${getBadgeStyles()}`}
      >
        <span>{getStatusLabel()}</span>
      </div>
      
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`${isLoading ? 'animate-spin' : ''}`}
          >
            <path
              d="M14 8.00005C14 11.3138 11.3137 14.0001 8 14.0001C4.68629 14.0001 2 11.3138 2 8.00005C2 4.68634 4.68629 2.00005 8 2.00005"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M12.7071 3.70718L8.70711 7.70718"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M14.9999 2.00005L11.9999 2.00005L11.9999 5.00005"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="sr-only">Refresh</span>
        </Button>
      )}
    </div>
  );
}
