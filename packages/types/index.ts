// Export shared types that both main and admin apps can use

// Import the actual AppRouter type from the main app
export type { AppRouter } from "../../apps/main/src/server/api/root";

// Backup interface in case the import doesn't work
export interface AppRouterFallback {
  project: {
    getUserProjects: any;
    create: any;
    getById: any;
    update: any;
    delete: any;
  };
  chat: {
    getMessages: any;
    sendMessage: any;
  };
  render: {
    renderVideo: any;
    getRenderStatus: any;
  };
  generation: {
    generateScene: any;
    editScene: any;
    deleteScene: any;
  };
  voice: {
    transcribe: any;
  };
  feedback: {
    submit: any;
    getAll: any;
  };
  emailSubscriber: {
    subscribe: any;
    unsubscribe: any;
  };
  scenes: {
    getAll: any;
    getById: any;
    update: any;
    delete: any;
  };
  share: {
    createShare: any;
    getSharedProject: any;
  };
  admin: {
    checkAdminAccess: any;
    toggleUserAdmin: any;
    getTotalUsers: any;
    getProjectsCreated: any;
    getScenesCreated: any;
    getRecentFeedback: any;
    getDashboardMetrics: any;
    getUsers: any;
    getUser: any;
    updateUser: any;
    deleteUser: any;
    getUserActivity: any;
    getAnalyticsData: any;
    getAnalyticsOverview: any;
    runEvaluation: any;
    createCustomSuite: any;
    getEvaluationSuites: any;
    getModelPacks: any;
    createCustomPrompt: any;
    createCustomModelPack: any;
    analyzeUploadedImage: any;
    generateSceneFromImage: any;
    getUserAnalytics: any;
    getUserActivityTimeline: any;
    getUserDetails: any;
    getUserProjects: any;
    getUserProjectDetails: any;
    getUserScenes: any;
    getSceneDetails: any;
  };
}