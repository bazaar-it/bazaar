// Type declarations for admin app API

declare module "../lib/api" {
  export const api: {
    admin: {
      checkAdminAccess: {
        useQuery: (input?: any, options?: any) => any;
      };
      getDashboardMetrics: {
        useQuery: (input?: any, options?: any) => any;
      };
      getUserAnalytics: {
        useQuery: (input?: any, options?: any) => any;
      };
      getRecentFeedback: {
        useQuery: (input?: any, options?: any) => any;
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
      getUserActivity: {
        useQuery: (input?: any, options?: any) => any;
      };
      getAnalyticsData: {
        useQuery: (input?: any, options?: any) => any;
      };
      toggleUserAdmin: {
        useMutation: (options?: any) => any;
      };
    };
  };
}