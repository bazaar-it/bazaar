/**
 * GitHub Integration Error Types and Messages
 */

export enum GitHubErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  AUTH_FAILED = 'AUTH_FAILED',
  REPO_NOT_FOUND = 'REPO_NOT_FOUND',
  NO_REPOS_SELECTED = 'NO_REPOS_SELECTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export class GitHubError extends Error {
  constructor(
    public code: GitHubErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'GitHubError';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case GitHubErrorCode.FILE_NOT_FOUND:
        return `Could not find the component file. Please ensure it exists in your repository and the path is correct.`;
      
      case GitHubErrorCode.RATE_LIMITED:
        return `GitHub API rate limit exceeded. Please wait a few minutes and try again, or connect a GitHub account with higher limits.`;
      
      case GitHubErrorCode.AUTH_FAILED:
        return `GitHub authentication failed. Please reconnect your GitHub account in Settings.`;
      
      case GitHubErrorCode.REPO_NOT_FOUND:
        return `Repository not found or you don't have access. Please check your repository settings.`;
      
      case GitHubErrorCode.NO_REPOS_SELECTED:
        return `No repositories selected. Please go to Settings and select at least one repository to search.`;
      
      case GitHubErrorCode.NETWORK_ERROR:
        return `Network error while connecting to GitHub. Please check your internet connection and try again.`;
      
      case GitHubErrorCode.PARSE_ERROR:
        return `Could not parse the component file. Please ensure it's a valid React/TypeScript component.`;
      
      default:
        return `An error occurred while fetching from GitHub. Please try again or use the generic animation option.`;
    }
  }

  /**
   * Get suggested action for the error
   */
  getSuggestedAction(): string {
    switch (this.code) {
      case GitHubErrorCode.FILE_NOT_FOUND:
        return 'Verify the file path or try searching by component name only.';
      
      case GitHubErrorCode.RATE_LIMITED:
        return 'Wait 5 minutes or upgrade to GitHub Pro for higher limits.';
      
      case GitHubErrorCode.AUTH_FAILED:
        return 'Go to Settings → GitHub → Reconnect Account';
      
      case GitHubErrorCode.REPO_NOT_FOUND:
        return 'Check repository visibility and permissions.';
      
      case GitHubErrorCode.NO_REPOS_SELECTED:
        return 'Go to Settings → GitHub → Select Repositories';
      
      case GitHubErrorCode.NETWORK_ERROR:
        return 'Check your connection and retry.';
      
      case GitHubErrorCode.PARSE_ERROR:
        return 'Ensure the file contains valid JSX/TSX code.';
      
      default:
        return 'Try again or disable GitHub mode for generic animation.';
    }
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(): boolean {
    return [
      GitHubErrorCode.RATE_LIMITED,
      GitHubErrorCode.NETWORK_ERROR,
      GitHubErrorCode.UNKNOWN
    ].includes(this.code);
  }

  /**
   * Create GitHubError from API error
   */
  static fromApiError(error: any): GitHubError {
    // GitHub API errors
    if (error.status === 404) {
      return new GitHubError(
        GitHubErrorCode.FILE_NOT_FOUND,
        'File or repository not found',
        error
      );
    }
    
    if (error.status === 403) {
      // Check if it's rate limiting
      if (error.response?.headers?.['x-ratelimit-remaining'] === '0') {
        return new GitHubError(
          GitHubErrorCode.RATE_LIMITED,
          'GitHub API rate limit exceeded',
          error
        );
      }
      return new GitHubError(
        GitHubErrorCode.AUTH_FAILED,
        'Permission denied',
        error
      );
    }
    
    if (error.status === 401) {
      return new GitHubError(
        GitHubErrorCode.AUTH_FAILED,
        'Authentication failed',
        error
      );
    }
    
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new GitHubError(
        GitHubErrorCode.NETWORK_ERROR,
        'Network connection failed',
        error
      );
    }
    
    // Default
    return new GitHubError(
      GitHubErrorCode.UNKNOWN,
      error.message || 'Unknown error occurred',
      error
    );
  }
}

/**
 * Error recovery strategies
 */
export const ErrorRecovery = {
  /**
   * Get retry delay based on error type
   */
  getRetryDelay(error: GitHubError, attempt: number): number {
    if (error.code === GitHubErrorCode.RATE_LIMITED) {
      // For rate limiting, wait longer
      return Math.min(60000 * attempt, 300000); // 1-5 minutes
    }
    
    if (error.code === GitHubErrorCode.NETWORK_ERROR) {
      // For network errors, exponential backoff
      return Math.min(1000 * Math.pow(2, attempt), 30000); // 1-30 seconds
    }
    
    // Default exponential backoff
    return Math.min(500 * Math.pow(2, attempt), 10000); // 0.5-10 seconds
  },

  /**
   * Should retry based on error type
   */
  shouldRetry(error: GitHubError, attempt: number): boolean {
    // Don't retry auth failures or file not found
    if ([GitHubErrorCode.AUTH_FAILED, GitHubErrorCode.FILE_NOT_FOUND].includes(error.code)) {
      return false;
    }
    
    // Retry recoverable errors up to 3 times
    return error.isRecoverable() && attempt < 3;
  }
};