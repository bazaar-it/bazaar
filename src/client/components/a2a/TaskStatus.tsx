// src/client/components/a2a/TaskStatus.tsx

'use client';

import { useTaskStatus } from '~/client/hooks/sse/useTaskStatus';
import { TaskStatusBadge } from './TaskStatusBadge';
import type { TaskStatus as TaskStatusType } from '~/types/a2a';

interface TaskStatusProps {
  taskId: string;
  autoSubscribe?: boolean;
  className?: string;
  onStatusChange?: (status: TaskStatusType) => void;
}

/**
 * Component to display and monitor task status in real-time
 */
export function TaskStatus({
  taskId,
  autoSubscribe = true,
  className,
  onStatusChange,
}: TaskStatusProps) {
  const { status, isLoading, refresh } = useTaskStatus(taskId, {
    autoSubscribe,
    onStatusChange,
  });

  return (
    <TaskStatusBadge
      status={status}
      isLoading={isLoading}
      onRefresh={refresh}
      className={className}
    />
  );
}
