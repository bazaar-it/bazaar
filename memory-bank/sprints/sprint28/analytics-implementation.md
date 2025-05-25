# Analytics Implementation - Sprint 28 📊

**Domain**: bazaar.it  
**Goal**: Track user behavior and performance for Reddit beta launch

## 🤖 **WHAT I CAN IMPLEMENT IN CODEBASE**

### **1. Google Analytics 4 Integration**

**Setup GA4 Script**
```typescript
// src/lib/analytics/gtag.ts
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// Initialize Google Analytics
export const gtag = (...args: any[]) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
};

// Track page views
export const pageview = (url: string) => {
  gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

// Track custom events
export const event = (action: string, parameters: any) => {
  gtag('event', action, parameters);
};
```

**Add GA Script to Layout**
```typescript
// src/app/layout.tsx
import Script from 'next/script';
import { GA_TRACKING_ID } from '@/lib/analytics/gtag';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        {/* Google Analytics */}
        {GA_TRACKING_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_TRACKING_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Track Key User Events**
```typescript
// src/lib/analytics/events.ts
import { event } from './gtag';

export const trackOAuthLogin = (provider: 'google' | 'github') => {
  event('login', {
    method: provider,
    event_category: 'authentication',
  });
};

export const trackSignup = (provider: 'google' | 'github') => {
  event('sign_up', {
    method: provider,
    event_category: 'authentication',
  });
};

export const trackProjectCreated = () => {
  event('project_created', {
    event_category: 'project_management',
  });
};

export const trackSceneGeneration = (success: boolean, duration: number) => {
  event('scene_generation', {
    event_category: 'content_creation',
    success: success,
    duration_seconds: duration,
  });
};

export const trackSceneEdit = (sceneId: string) => {
  event('scene_edit', {
    event_category: 'content_creation',
    scene_id: sceneId,
  });
};

export const trackPreviewView = (sceneId: string) => {
  event('preview_view', {
    event_category: 'content_consumption',
    scene_id: sceneId,
  });
};

export const trackRedditReferral = () => {
  event('reddit_referral', {
    event_category: 'acquisition',
    source: 'reddit',
  });
};
```

### **2. Vercel Analytics Integration**

**Install and Configure**
```typescript
// src/lib/analytics/vercel.ts
import { Analytics } from '@vercel/analytics/react';

export function VercelAnalytics() {
  return <Analytics />;
}
```

**Add to Layout**
```typescript
// src/app/layout.tsx (updated)
import { VercelAnalytics } from '@/lib/analytics/vercel';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <VercelAnalytics />
      </body>
    </html>
  );
}
```

### **3. Custom Event Tracking in Components**

**OAuth Login Tracking**
```typescript
// src/app/login/page.tsx
import { trackOAuthLogin, trackSignup } from '@/lib/analytics/events';

export default function LoginPage() {
  const handleGoogleLogin = () => {
    trackOAuthLogin('google');
    // Existing OAuth logic
  };

  const handleGitHubLogin = () => {
    trackOAuthLogin('github');
    // Existing OAuth logic
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>Login with Google</button>
      <button onClick={handleGitHubLogin}>Login with GitHub</button>
    </div>
  );
}
```

**Scene Generation Tracking**
```typescript
// src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
import { trackSceneGeneration } from '@/lib/analytics/events';

const handleSceneGeneration = async (prompt: string) => {
  const startTime = Date.now();
  
  try {
    // Existing scene generation logic
    const result = await generateScene(prompt);
    
    const duration = (Date.now() - startTime) / 1000;
    trackSceneGeneration(true, duration);
    
    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    trackSceneGeneration(false, duration);
    throw error;
  }
};
```

**Project Management Tracking**
```typescript
// src/app/projects/new/page.tsx
import { trackProjectCreated } from '@/lib/analytics/events';

const handleCreateProject = async (projectData: any) => {
  try {
    const project = await createProject(projectData);
    trackProjectCreated();
    return project;
  } catch (error) {
    // Handle error
  }
};
```

### **4. Reddit Referral Tracking**

**Detect Reddit Traffic**
```typescript
// src/lib/analytics/referral.ts
export const detectReferralSource = () => {
  if (typeof window === 'undefined') return null;
  
  const referrer = document.referrer;
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for Reddit referrals
  if (referrer.includes('reddit.com') || urlParams.get('ref') === 'reddit') {
    return 'reddit';
  }
  
  // Check for other sources
  if (referrer.includes('google.com')) return 'google';
  if (referrer.includes('twitter.com')) return 'twitter';
  if (referrer.includes('facebook.com')) return 'facebook';
  
  return 'direct';
};

export const trackReferralSource = () => {
  const source = detectReferralSource();
  
  if (source === 'reddit') {
    trackRedditReferral();
  }
  
  // Store in session for later attribution
  sessionStorage.setItem('referral_source', source || 'direct');
};
```

**Track on Page Load**
```typescript
// src/app/page.tsx
import { useEffect } from 'react';
import { trackReferralSource } from '@/lib/analytics/referral';

export default function HomePage() {
  useEffect(() => {
    trackReferralSource();
  }, []);

  return (
    <div>
      {/* Homepage content */}
    </div>
  );
}
```

### **5. Performance Monitoring**

**Track Core Web Vitals**
```typescript
// src/lib/analytics/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import { event } from './gtag';

export const trackWebVitals = () => {
  getCLS((metric) => {
    event('web_vitals', {
      event_category: 'performance',
      metric_name: 'CLS',
      metric_value: metric.value,
    });
  });

  getFID((metric) => {
    event('web_vitals', {
      event_category: 'performance',
      metric_name: 'FID',
      metric_value: metric.value,
    });
  });

  getFCP((metric) => {
    event('web_vitals', {
      event_category: 'performance',
      metric_name: 'FCP',
      metric_value: metric.value,
    });
  });

  getLCP((metric) => {
    event('web_vitals', {
      event_category: 'performance',
      metric_name: 'LCP',
      metric_value: metric.value,
    });
  });

  getTTFB((metric) => {
    event('web_vitals', {
      event_category: 'performance',
      metric_name: 'TTFB',
      metric_value: metric.value,
    });
  });
};
```

### **6. Error Tracking with Sentry**

**Setup Sentry**
```typescript
// src/lib/analytics/sentry.ts
import * as Sentry from '@sentry/nextjs';

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
  });
};

export const trackError = (error: Error, context?: any) => {
  Sentry.captureException(error, {
    tags: {
      component: context?.component,
      action: context?.action,
    },
    extra: context,
  });
};
```

## 👤 **WHAT YOU MUST CONFIGURE MANUALLY**

### **1. Google Analytics Setup**

**Create GA4 Property**
1. Go to [Google Analytics](https://analytics.google.com)
2. Click "Create Account"
3. Account name: "Bazaar"
4. Property name: "bazaar.it"
5. Industry: "Technology" or "Entertainment"
6. Business size: "Small"
7. Choose "Web" as platform
8. Website URL: `https://bazaar.it`
9. Stream name: "bazaar.it - Web"
10. **Copy the Measurement ID** (starts with G-)

**Configure Goals and Conversions**
- Set up conversion events:
  - `sign_up` (user registration)
  - `project_created` (project creation)
  - `scene_generation` (successful scene generation)

### **2. Environment Variables**

**Add to Production Environment**
```bash
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn

# Vercel Analytics (automatic if using Vercel)
VERCEL_ANALYTICS_ID=your-vercel-id
```

### **3. Privacy Compliance**

**Add Privacy Policy**
- Create privacy policy page
- Mention Google Analytics usage
- Provide opt-out instructions
- Comply with GDPR/CCPA if applicable

**Cookie Consent** (optional)
- Add cookie consent banner
- Allow users to opt-out of tracking
- Respect user preferences

## 📊 **ANALYTICS DASHBOARD SETUP**

### **Key Metrics to Track**

**User Acquisition**
- New users from Reddit
- OAuth signup conversion rate
- Traffic sources breakdown
- Geographic distribution

**User Engagement**
- Session duration
- Pages per session
- Bounce rate
- Return user rate

**Feature Usage**
- Scene generation success rate
- Average scenes per project
- Most popular scene types
- User retention by cohort

**Performance**
- Page load times
- Scene generation speed
- Error rates
- Core Web Vitals scores

### **Custom Reports I Can Set Up**

**Reddit Launch Dashboard**
```typescript
// src/components/analytics/LaunchDashboard.tsx
export function LaunchDashboard() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        title="Reddit Signups"
        value={redditSignups}
        change="+12%"
      />
      <MetricCard
        title="Scene Generations"
        value={sceneGenerations}
        change="+8%"
      />
      <MetricCard
        title="Success Rate"
        value="94%"
        change="+2%"
      />
      <MetricCard
        title="Avg Load Time"
        value="2.1s"
        change="-0.3s"
      />
    </div>
  );
}
```

## 🧪 **ANALYTICS TESTING**

### **Test Events in Development**
```typescript
// src/__tests__/analytics/events.test.ts
describe('Analytics Events', () => {
  test('should track OAuth login', () => {
    const mockGtag = jest.fn();
    window.gtag = mockGtag;
    
    trackOAuthLogin('google');
    
    expect(mockGtag).toHaveBeenCalledWith('event', 'login', {
      method: 'google',
      event_category: 'authentication',
    });
  });
});
```

### **Verify Tracking in Production**
- Use Google Analytics Real-Time reports
- Check Vercel Analytics dashboard
- Monitor Sentry error reports
- Verify events are firing correctly

## ✅ **ANALYTICS IMPLEMENTATION CHECKLIST**

### **🤖 Codebase Implementation (I Can Do)**
- [ ] Google Analytics 4 script integration
- [ ] Vercel Analytics setup
- [ ] Custom event tracking for key actions
- [ ] Reddit referral detection
- [ ] Performance monitoring (Core Web Vitals)
- [ ] Error tracking with Sentry
- [ ] Privacy-compliant implementation
- [ ] Analytics testing suite

### **👤 Manual Configuration (You Must Do)**
- [ ] Create Google Analytics 4 property
- [ ] Get GA4 Measurement ID
- [ ] Set up conversion goals in GA4
- [ ] Configure Vercel Analytics (if using Vercel)
- [ ] Set up Sentry project (optional)
- [ ] Add environment variables to production
- [ ] Create privacy policy
- [ ] Test analytics in production

### **📈 Launch Day Monitoring**
- [ ] Monitor real-time analytics during Reddit launch
- [ ] Track signup conversion rates
- [ ] Monitor scene generation success rates
- [ ] Watch for performance issues
- [ ] Track error rates and types

## 🎯 **READY FOR DATA-DRIVEN LAUNCH!**

With comprehensive analytics in place, we'll have full visibility into:
- How users discover bazaar.it (especially from Reddit)
- User behavior and engagement patterns
- Feature usage and success rates
- Performance and error metrics
- Conversion funnel optimization opportunities

This data will be crucial for iterating and improving the product after the Reddit beta launch! 📊🚀 