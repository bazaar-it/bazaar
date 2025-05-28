//src/lib/analytics.ts

import type { Metric } from 'web-vitals';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Google Analytics 4 Configuration
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Initialize Google Analytics
export const initGA = () => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics Measurement ID not found');
    return;
  }

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Custom Events for Bazaar-Vid
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      custom_parameter: true,
      ...parameters,
    });
  }
};

// User Journey Events
export const analytics = {
  // Authentication Events
  userSignUp: (method: 'google' | 'github') => {
    trackEvent('sign_up', {
      method,
      timestamp: new Date().toISOString(),
    });
  },

  userLogin: (method: 'google' | 'github') => {
    trackEvent('login', {
      method,
      timestamp: new Date().toISOString(),
    });
  },

  // Video Generation Events
  videoGenerationStarted: (projectId: string, prompt: string) => {
    trackEvent('video_generation_started', {
      project_id: projectId,
      prompt_length: prompt.length,
      timestamp: new Date().toISOString(),
    });
  },

  videoGenerationCompleted: (projectId: string, duration: number, sceneCount: number) => {
    trackEvent('video_generation_completed', {
      project_id: projectId,
      generation_duration_ms: duration,
      scene_count: sceneCount,
      timestamp: new Date().toISOString(),
    });
  },

  videoGenerationFailed: (projectId: string, error: string, step: string) => {
    trackEvent('video_generation_failed', {
      project_id: projectId,
      error_message: error,
      failure_step: step,
      timestamp: new Date().toISOString(),
    });
  },

  // Project Events
  projectCreated: (projectId: string) => {
    trackEvent('project_created', {
      project_id: projectId,
      timestamp: new Date().toISOString(),
    });
  },

  projectOpened: (projectId: string) => {
    trackEvent('project_opened', {
      project_id: projectId,
      timestamp: new Date().toISOString(),
    });
  },

  // Scene Events
  sceneEdited: (projectId: string, sceneId: string, editType: string) => {
    trackEvent('scene_edited', {
      project_id: projectId,
      scene_id: sceneId,
      edit_type: editType,
      timestamp: new Date().toISOString(),
    });
  },

  // Chat Events
  chatMessageSent: (projectId: string, messageLength: number, hasContext: boolean) => {
    trackEvent('chat_message_sent', {
      project_id: projectId,
      message_length: messageLength,
      has_context: hasContext,
      timestamp: new Date().toISOString(),
    });
  },

  // Error Events
  errorOccurred: (errorType: string, errorMessage: string, page: string) => {
    trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      page,
      timestamp: new Date().toISOString(),
    });
  },

  // Performance Events
  pageLoadTime: (page: string, loadTime: number) => {
    trackEvent('page_load_time', {
      page,
      load_time_ms: loadTime,
      timestamp: new Date().toISOString(),
    });
  },

  // Feature Usage
  featureUsed: (featureName: string, context?: Record<string, any>) => {
    trackEvent('feature_used', {
      feature_name: featureName,
      ...context,
      timestamp: new Date().toISOString(),
    });
  },

  // Reddit Referral Tracking - CRITICAL FOR LAUNCH
  redditReferral: (subreddit?: string, post?: string) => {
    trackEvent('reddit_referral', {
      subreddit,
      post,
      timestamp: new Date().toISOString(),
    });
  },

  // Beta Launch Events
  betaUserSignup: (source: string) => {
    trackEvent('beta_user_signup', {
      source,
      timestamp: new Date().toISOString(),
    });
  },

  firstSceneGenerated: (projectId: string, timeToFirstScene: number) => {
    trackEvent('first_scene_generated', {
      project_id: projectId,
      time_to_first_scene_ms: timeToFirstScene,
      timestamp: new Date().toISOString(),
    });
  },
};

// Reddit Referral Detection - CRITICAL FOR LAUNCH
export const detectRedditReferral = () => {
  if (typeof window === 'undefined') return;

  const referrer = document.referrer;
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for Reddit referrer
  if (referrer.includes('reddit.com')) {
    const subredditMatch = referrer.match(/reddit\.com\/r\/([^\/]+)/);
    const subreddit = subredditMatch ? subredditMatch[1] : undefined;
    
    analytics.redditReferral(subreddit);
    
    // Store for later attribution
    sessionStorage.setItem('referral_source', 'reddit');
    if (subreddit) {
      sessionStorage.setItem('referral_subreddit', subreddit);
    }
  }

  // Check for UTM parameters (for Reddit campaigns)
  if (urlParams.get('utm_source') === 'reddit') {
    analytics.redditReferral(
      urlParams.get('utm_campaign') || undefined,
      urlParams.get('utm_content') || undefined
    );
    
    sessionStorage.setItem('referral_source', 'reddit');
  }

  // Check for direct Reddit parameter
  if (urlParams.get('ref') === 'reddit') {
    analytics.redditReferral();
    sessionStorage.setItem('referral_source', 'reddit');
  }
};

// Core Web Vitals Tracking (simplified)
export const trackWebVitals = async () => {
  if (typeof window === 'undefined') return;

  try {
    // Track Core Web Vitals when available
    const { onCLS, onLCP, onFCP, onTTFB, onINP } = await import('web-vitals');
    
    // Track CLS (Cumulative Layout Shift)
    if (onCLS) {
      onCLS((metric) => {
        trackEvent('web_vital_cls', {
          value: metric.value,
          rating: metric.rating,
        });
      });
    }

    // Track LCP (Largest Contentful Paint)
    if (onLCP) {
      onLCP((metric) => {
        trackEvent('web_vital_lcp', {
          value: metric.value,
          rating: metric.rating,
        });
      });
    }

    // Track FCP (First Contentful Paint)
    if (onFCP) {
      onFCP((metric) => {
        trackEvent('web_vital_fcp', {
          value: metric.value,
          rating: metric.rating,
        });
      });
    }

    // Track TTFB (Time to First Byte)
    if (onTTFB) {
      onTTFB((metric) => {
        trackEvent('web_vital_ttfb', {
          value: metric.value,
          rating: metric.rating,
        });
      });
    }

    // Track INP (Interaction to Next Paint) - replaces FID
    if (onINP) {
      onINP((metric) => {
        trackEvent('web_vital_inp', {
          value: metric.value,
          rating: metric.rating,
        });
      });
    }
  } catch (error) {
    // web-vitals not available, skip tracking
    console.warn('Web Vitals tracking unavailable:', error);
  }
};

// Initialize analytics on app start
export const initializeAnalytics = () => {
  if (typeof window === 'undefined') return;

  initGA();
  detectRedditReferral();
  trackWebVitals(); // This is now async but we don't need to await it
  
  // Track page load time
  window.addEventListener('load', () => {
    const loadTime = performance.now();
    analytics.pageLoadTime(window.location.pathname, loadTime);
  });
}; 