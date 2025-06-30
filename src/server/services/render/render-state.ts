// src/server/services/render/render-state.ts

interface RenderJob {
  id: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress: number;
  outputPath?: string;
  outputUrl?: string; // Lambda output URL
  error?: string;
  userId: string;
  projectId: string;
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  createdAt: number;
  // Track if we're at the FFmpeg finalization stage
  isFinalizingFFmpeg?: boolean;
  bucketName?: string; // Lambda bucket for progress checking
}

// In-memory state for MVP (will be replaced with database in production)
const activeRenders = new Map<string, RenderJob>();

// Cleanup old renders periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  for (const [id, job] of activeRenders.entries()) {
    if (now - job.createdAt > TWENTY_FOUR_HOURS) {
      activeRenders.delete(id);
      console.log(`[RenderState] Cleaned up old render job: ${id}`);
    }
  }
}, 60 * 60 * 1000); // Run every hour

export const renderState = {
  get: (id: string) => activeRenders.get(id),
  
  set: (id: string, job: RenderJob) => activeRenders.set(id, job),
  
  getAllIds: () => Array.from(activeRenders.keys()),
  
  isRendering: () => {
    return Array.from(activeRenders.values()).some(
      job => job.status === 'rendering'
    );
  },
  
  updateProgress: (id: string, progress: number) => {
    const job = activeRenders.get(id);
    if (job) {
      // Detect if we're in the FFmpeg finalization stage (stuck around 95%)
      if (progress >= 0.95 && !job.isFinalizingFFmpeg) {
        job.isFinalizingFFmpeg = true;
        console.log(`[RenderState] Job ${id} entering FFmpeg finalization stage`);
      }
      job.progress = progress;
      activeRenders.set(id, job);
    }
  },
  
  getUserRenders: (userId: string) => {
    return Array.from(activeRenders.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  
  // Check if user has any renders in progress
  userHasActiveRender: (userId: string) => {
    return Array.from(activeRenders.values()).some(
      job => job.userId === userId && job.status === 'rendering'
    );
  },
  
  // Get today's render count for quota checking
  getUserTodayRenderCount: (userId: string) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTime = startOfToday.getTime();
    
    return Array.from(activeRenders.values()).filter(
      job => job.userId === userId && job.createdAt >= startTime
    ).length;
  },
};