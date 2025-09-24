export interface ErrorDetails {
  sceneName: string;
  errorMessage: string;
  timestamp: number;
  errorType?: string;
}

export interface AutoFixQueueItem {
  sceneId: string;
  errorDetails: ErrorDetails;
  attempts: number;
  firstErrorTime: number;
  lastAttemptTime: number;
  debounceTimer?: NodeJS.Timeout;
  previousErrors?: string[]; // Track error messages from previous attempts
}
