// Temporary type definitions for the admin app
// This provides type safety until we can properly import from the main app

export interface AdminRouterType {
  checkAdminAccess: {
    useQuery: (input?: any, options?: any) => {
      data?: { isAdmin: boolean };
      isLoading: boolean;
      error?: any;
    };
  };
  getDashboardMetrics: {
    useQuery: (input?: any, options?: any) => {
      data?: {
        users: { all: number; last30Days: number; last7Days: number; last24Hours: number };
        projects: { all: number; last30Days: number; last7Days: number; last24Hours: number };
        scenes: { all: number; last30Days: number; last7Days: number; last24Hours: number };
        recentFeedback: any[];
      };
      isLoading: boolean;
      error?: any;
    };
  };
  getUserAnalytics: {
    useQuery: (input?: any, options?: any) => {
      data?: any[];
      isLoading: boolean;
      error?: any;
    };
  };
  getRecentFeedback: {
    useQuery: (input?: any, options?: any) => {
      data?: any[];
      isLoading: boolean;
      error?: any;
    };
  };
  getUsers: {
    useQuery: (input?: any, options?: any) => any;
  };
  getUser: {
    useQuery: (input?: any, options?: any) => any;
  };
  updateUser: {
    useMutation: (options?: any) => any;
  };
  deleteUser: {
    useMutation: (options?: any) => any;
  };
  toggleUserAdmin: {
    useMutation: (options?: any) => any;
  };
}

export interface APIType {
  admin: AdminRouterType;
}