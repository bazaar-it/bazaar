# Feature 025: Panel Usage Analytics

**Priority**: LOW  
**Complexity**: MEDIUM  
**Effort**: 2-3 days  
**Dependencies**: Analytics system, Admin dashboard, Database schema

## Overview

Implement comprehensive analytics to track which workspace panels users actually use and for how long. This feature provides crucial insights into user behavior patterns, enabling data-driven decisions about UI improvements and resource allocation.

## Problem Statement

### Current Issues
- No visibility into user workflow preferences
- Unknown whether code panel is being used effectively
- Cannot measure panel usage distribution
- No data to guide UI optimization decisions
- Missing insights into power user vs casual user behavior
- Unable to validate feature importance with real usage data

### Business Value
- Make informed decisions about feature development priorities
- Optimize UI layout based on actual usage patterns
- Identify underutilized features for improvement or removal
- Understand user personas through behavior analysis
- Validate design decisions with quantitative data
- Guide onboarding flow improvements

## Technical Specification

### Analytics Data Structure

#### 1. Database Schema
```typescript
// New analytics table for panel usage
export const panelAnalytics = pgTable('panel_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // User context
  userId: varchar('user_id', { length: 255 }).notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  
  // Panel state
  panelType: varchar('panel_type', { length: 50 }).notNull(), // 'chat', 'preview', 'code', 'templates', 'storyboard'
  event: varchar('event', { length: 20 }).notNull(), // 'open', 'close', 'resize', 'focus', 'blur'
  
  // Panel dimensions
  widthPercent: real('width_percent'), // percentage of total workspace width
  heightPercent: real('height_percent'), // percentage of workspace height
  isVisible: boolean('is_visible').notNull(),
  
  // Layout context
  visiblePanels: json('visible_panels'), // array of currently visible panels
  layoutType: varchar('layout_type', { length: 50 }), // 'chat-preview', 'all-panels', 'code-only', etc.
  
  // Timing
  timestamp: timestamp('timestamp').defaultNow(),
  duration: integer('duration'), // milliseconds for focus/blur events
  
  // Metadata
  userAgent: varchar('user_agent', { length: 500 }),
  screenResolution: varchar('screen_resolution', { length: 20 }),
  viewportSize: varchar('viewport_size', { length: 20 })
});

// Aggregated analytics for performance
export const panelUsageSummary = pgTable('panel_usage_summary', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: date('date').notNull(),
  panelType: varchar('panel_type', { length: 50 }).notNull(),
  
  // Usage metrics
  totalUsers: integer('total_users').notNull(),
  totalSessions: integer('total_sessions').notNull(),
  totalOpenEvents: integer('total_open_events').notNull(),
  avgDurationMs: integer('avg_duration_ms'),
  
  // Layout patterns
  mostCommonLayout: varchar('most_common_layout', { length: 100 }),
  avgWidthPercent: real('avg_width_percent'),
  
  createdAt: timestamp('created_at').defaultNow()
});
```

#### 2. TypeScript Interfaces
```typescript
interface PanelState {
  type: 'chat' | 'preview' | 'code' | 'templates' | 'storyboard';
  isVisible: boolean;
  widthPercent: number;
  heightPercent: number;
  zIndex?: number;
}

interface WorkspaceLayout {
  panels: Record<string, PanelState>;
  activePanel: string;
  layoutType: string;
  timestamp: Date;
}

interface PanelAnalyticsEvent {
  userId: string;
  sessionId: string;
  projectId?: string;
  panelType: string;
  event: 'open' | 'close' | 'resize' | 'focus' | 'blur';
  panelState: PanelState;
  workspaceLayout: WorkspaceLayout;
  metadata: {
    userAgent: string;
    screenResolution: string;
    viewportSize: string;
  };
}
```

### Frontend Implementation

#### 1. Analytics Hook
```typescript
// Custom hook for tracking panel analytics
const usePanelAnalytics = () => {
  const { data: session } = useSession();
  const [sessionId] = useState(() => generateSessionId());
  const analyticsQueue = useRef<PanelAnalyticsEvent[]>([]);
  
  const trackPanelEvent = useCallback((
    panelType: string,
    event: string,
    panelState: PanelState,
    duration?: number
  ) => {
    if (!session?.user) return;
    
    const analyticsEvent: PanelAnalyticsEvent = {
      userId: session.user.id,
      sessionId,
      panelType,
      event,
      panelState,
      workspaceLayout: getCurrentLayout(),
      duration,
      metadata: {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`
      }
    };
    
    // Queue for batch sending
    analyticsQueue.current.push(analyticsEvent);
    
    // Send batch every 10 events or 30 seconds
    if (analyticsQueue.current.length >= 10) {
      sendAnalyticsBatch();
    }
  }, [session, sessionId]);
  
  const sendAnalyticsBatch = useCallback(async () => {
    if (analyticsQueue.current.length === 0) return;
    
    const events = [...analyticsQueue.current];
    analyticsQueue.current = [];
    
    try {
      await fetch('/api/analytics/panel-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      console.warn('Failed to send panel analytics:', error);
      // Re-queue failed events
      analyticsQueue.current.unshift(...events);
    }
  }, []);
  
  // Send batch on unmount
  useEffect(() => {
    const interval = setInterval(sendAnalyticsBatch, 30000);
    return () => {
      clearInterval(interval);
      sendAnalyticsBatch();
    };
  }, [sendAnalyticsBatch]);
  
  return { trackPanelEvent };
};
```

#### 2. Panel Tracking Components
```typescript
// Enhanced panel wrapper with analytics
const AnalyticsPanel = ({ 
  panelType, 
  children, 
  isVisible, 
  width, 
  height,
  ...props 
}) => {
  const { trackPanelEvent } = usePanelAnalytics();
  const panelRef = useRef<HTMLDivElement>(null);
  const focusStartTime = useRef<number>();
  
  // Track visibility changes
  useEffect(() => {
    const event = isVisible ? 'open' : 'close';
    trackPanelEvent(panelType, event, {
      type: panelType,
      isVisible,
      widthPercent: width,
      heightPercent: height
    });
  }, [isVisible, panelType, width, height]);
  
  // Track focus/blur events
  useEffect(() => {
    const element = panelRef.current;
    if (!element) return;
    
    const handleFocus = () => {
      focusStartTime.current = Date.now();
      trackPanelEvent(panelType, 'focus', {
        type: panelType,
        isVisible,
        widthPercent: width,
        heightPercent: height
      });
    };
    
    const handleBlur = () => {
      const duration = focusStartTime.current ? 
        Date.now() - focusStartTime.current : undefined;
      
      trackPanelEvent(panelType, 'blur', {
        type: panelType,
        isVisible,
        widthPercent: width,
        heightPercent: height
      }, duration);
    };
    
    element.addEventListener('focusin', handleFocus);
    element.addEventListener('focusout', handleBlur);
    
    return () => {
      element.removeEventListener('focusin', handleFocus);
      element.removeEventListener('focusout', handleBlur);
    };
  }, [panelType, isVisible, width, height]);
  
  // Track resize events
  const handleResize = useCallback((newWidth: number, newHeight: number) => {
    trackPanelEvent(panelType, 'resize', {
      type: panelType,
      isVisible,
      widthPercent: newWidth,
      heightPercent: newHeight
    });
  }, [panelType, isVisible, trackPanelEvent]);
  
  return (
    <div 
      ref={panelRef}
      className={`analytics-panel panel-${panelType}`}
      {...props}
    >
      {children}
    </div>
  );
};
```

#### 3. Layout Detection
```typescript
// Detect and classify current workspace layout
const useLayoutDetection = () => {
  const getLayoutType = useCallback((panelStates: Record<string, PanelState>) => {
    const visiblePanels = Object.entries(panelStates)
      .filter(([_, state]) => state.isVisible)
      .map(([type, _]) => type);
    
    const sortedPanels = visiblePanels.sort().join('-');
    
    // Common layout patterns
    const layoutMap: Record<string, string> = {
      'chat-preview': 'Basic (Chat + Preview)',
      'chat-preview-code': 'Developer (All Main Panels)',
      'chat-preview-templates': 'Creative (Chat + Preview + Templates)',
      'preview': 'Preview Only',
      'code': 'Code Only',
      'chat': 'Chat Only'
    };
    
    return layoutMap[sortedPanels] || `Custom (${visiblePanels.length} panels)`;
  }, []);
  
  const getCurrentLayout = useCallback(() => {
    // Get current panel states from workspace
    const panelStates = getPanelStates(); // Implementation depends on layout system
    return {
      panels: panelStates,
      layoutType: getLayoutType(panelStates),
      activePanel: getActivePanel(),
      timestamp: new Date()
    };
  }, [getLayoutType]);
  
  return { getCurrentLayout, getLayoutType };
};
```

### Backend Implementation

#### 1. Analytics API Endpoint
```typescript
// API route for receiving panel analytics
export async function POST(request: Request) {
  try {
    const { events } = await request.json();
    
    // Validate and sanitize events
    const validatedEvents = events.map(validateAnalyticsEvent);
    
    // Batch insert into database
    await db.insert(panelAnalytics).values(validatedEvents);
    
    // Update daily aggregates
    await updateDailyAggregates(validatedEvents);
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Panel analytics error:', error);
    return Response.json({ error: 'Failed to record analytics' }, { status: 500 });
  }
}
```

#### 2. Analytics Service
```typescript
// Service for processing analytics data
class PanelAnalyticsService {
  async getUsageStats(dateRange: DateRange) {
    const stats = await db
      .select({
        panelType: panelAnalytics.panelType,
        totalUsers: sql<number>`COUNT(DISTINCT ${panelAnalytics.userId})`,
        totalSessions: sql<number>`COUNT(DISTINCT ${panelAnalytics.sessionId})`,
        avgDuration: sql<number>`AVG(${panelAnalytics.duration})`,
        openEvents: sql<number>`COUNT(*) FILTER (WHERE ${panelAnalytics.event} = 'open')`
      })
      .from(panelAnalytics)
      .where(
        and(
          gte(panelAnalytics.timestamp, dateRange.start),
          lte(panelAnalytics.timestamp, dateRange.end)
        )
      )
      .groupBy(panelAnalytics.panelType);
    
    return stats;
  }
  
  async getLayoutPatterns(dateRange: DateRange) {
    const patterns = await db
      .select({
        layoutType: panelAnalytics.layoutType,
        usage: sql<number>`COUNT(*)`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${panelAnalytics.userId})`
      })
      .from(panelAnalytics)
      .where(
        and(
          gte(panelAnalytics.timestamp, dateRange.start),
          lte(panelAnalytics.timestamp, dateRange.end),
          eq(panelAnalytics.event, 'open')
        )
      )
      .groupBy(panelAnalytics.layoutType)
      .orderBy(desc(sql`COUNT(*)`));
    
    return patterns;
  }
  
  async getUserSegments() {
    // Classify users based on panel usage patterns
    const segments = await db.execute(sql`
      WITH user_panel_usage AS (
        SELECT 
          user_id,
          panel_type,
          COUNT(*) as usage_count,
          AVG(duration) as avg_duration
        FROM ${panelAnalytics}
        WHERE event = 'focus' AND duration IS NOT NULL
        GROUP BY user_id, panel_type
      )
      SELECT 
        user_id,
        CASE 
          WHEN code_usage > 10 AND preview_usage > 10 THEN 'Power User'
          WHEN code_usage > 0 THEN 'Developer'
          WHEN templates_usage > chat_usage THEN 'Template User'
          ELSE 'Casual User'
        END as segment
      FROM (
        SELECT 
          user_id,
          COALESCE(MAX(CASE WHEN panel_type = 'code' THEN usage_count END), 0) as code_usage,
          COALESCE(MAX(CASE WHEN panel_type = 'preview' THEN usage_count END), 0) as preview_usage,
          COALESCE(MAX(CASE WHEN panel_type = 'chat' THEN usage_count END), 0) as chat_usage,
          COALESCE(MAX(CASE WHEN panel_type = 'templates' THEN usage_count END), 0) as templates_usage
        FROM user_panel_usage
        GROUP BY user_id
      ) t
    `);
    
    return segments;
  }
}
```

### Admin Dashboard

#### 1. Panel Usage Overview
```typescript
const PanelUsageDashboard = () => {
  const [dateRange, setDateRange] = useState({ 
    start: subDays(new Date(), 30), 
    end: new Date() 
  });
  
  const { data: usageStats } = api.analytics.getPanelUsage.useQuery(dateRange);
  const { data: layoutPatterns } = api.analytics.getLayoutPatterns.useQuery(dateRange);
  
  return (
    <div className="panel-usage-dashboard">
      <div className="dashboard-header">
        <h2>Panel Usage Analytics</h2>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>
      
      <div className="stats-grid">
        <Card>
          <CardHeader>
            <CardTitle>Panel Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usageStats}
                  dataKey="totalUsers"
                  nameKey="panelType"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Most Common Layouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="layout-list">
              {layoutPatterns?.map(pattern => (
                <div key={pattern.layoutType} className="layout-item">
                  <span className="layout-name">{pattern.layoutType}</span>
                  <div className="layout-stats">
                    <span>{pattern.uniqueUsers} users</span>
                    <span>{pattern.usage} sessions</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <PanelHeatmap data={usageStats} />
      <UserSegmentAnalysis />
    </div>
  );
};
```

#### 2. Insights Generator
```typescript
// Generate actionable insights from analytics data
class AnalyticsInsightsGenerator {
  generateInsights(usageData: PanelUsageData): Insight[] {
    const insights: Insight[] = [];
    
    // Code panel usage analysis
    const codeUsage = usageData.find(d => d.panelType === 'code');
    if (codeUsage && codeUsage.totalUsers < usageData[0].totalUsers * 0.1) {
      insights.push({
        type: 'warning',
        title: 'Low Code Panel Usage',
        description: `Only ${codeUsage.totalUsers} users use the code panel. Consider simplifying or removing it.`,
        actionable: 'Survey users about code panel utility'
      });
    }
    
    // Chat panel dominance
    const chatUsage = usageData.find(d => d.panelType === 'chat');
    const previewUsage = usageData.find(d => d.panelType === 'preview');
    
    if (chatUsage && previewUsage && chatUsage.avgDuration > previewUsage.avgDuration * 2) {
      insights.push({
        type: 'info',
        title: 'Chat-Centric Usage',
        description: 'Users spend significantly more time in chat than preview. Chat UX is critical.',
        actionable: 'Prioritize chat experience improvements'
      });
    }
    
    return insights;
  }
}
```

## Implementation Plan

### Phase 1: Analytics Infrastructure (Day 1)
1. Create database schema for panel analytics
2. Implement analytics API endpoint
3. Create PanelAnalyticsService
4. Set up data validation and sanitization

### Phase 2: Frontend Tracking (Day 1.5)
1. Create usePanelAnalytics hook
2. Implement AnalyticsPanel wrapper
3. Add layout detection logic
4. Integrate with existing panels
5. Test event tracking

### Phase 3: Admin Dashboard (Day 2)
1. Build panel usage dashboard
2. Create visualization components
3. Implement insights generator
4. Add export functionality
5. Test with real data

### Phase 4: Analysis & Optimization (Day 2.5-3)
1. Optimize analytics performance
2. Add data aggregation jobs
3. Create automated insights
4. Polish dashboard UI
5. Document findings and recommendations

## Success Metrics

- **Data Collection**: 95% of panel interactions tracked
- **Performance**: <50ms impact on panel operations
- **Insights**: Generate 3-5 actionable insights per week
- **Dashboard Usage**: Admin team uses dashboard weekly
- **Decision Impact**: 2+ UI decisions based on analytics data

## Privacy & Compliance

### 1. Data Minimization
- Only collect necessary panel interaction data
- No collection of actual content or personal information
- Aggregate data whenever possible
- Automatic data purging after 90 days

### 2. User Consent
```typescript
// Add to privacy policy and settings
const AnalyticsConsent = () => {
  const [consent, setConsent] = useLocalStorage('analytics-consent', false);
  
  return (
    <div className="analytics-consent">
      <p>Help us improve your experience by sharing anonymous usage data.</p>
      <Switch checked={consent} onCheckedChange={setConsent} />
      <Label>Share anonymous usage analytics</Label>
    </div>
  );
};
```

### 3. Data Security
- Encrypt sensitive identifiers
- Use secure API endpoints
- Regular data cleanup
- Access controls for admin dashboard

## Expected Insights

### 1. Usage Patterns
- "85% of users never open the code panel"
- "Average session uses 2.3 panels simultaneously"
- "Chat + Preview is 60% of all layouts"

### 2. User Segmentation
- **Power Users**: Use all panels, high code panel usage
- **Developers**: High code + preview usage
- **Creators**: High chat + templates usage  
- **Casual Users**: Chat + preview only

### 3. Optimization Opportunities
- Remove or simplify underused panels
- Optimize most-used panel layouts
- Improve panel switching UX
- Personalize interface based on usage patterns

## Related Features

- User preferences and personalization
- Adaptive UI based on usage patterns
- Feature flagging based on analytics
- A/B testing infrastructure

## Future Enhancements

1. **Advanced Analytics**
   - Heatmaps of panel interactions
   - User journey mapping
   - Predictive usage modeling
   - Real-time analytics dashboard

2. **Adaptive UI**
   - Auto-hide unused panels
   - Personalized default layouts
   - Smart panel suggestions
   - Usage-based feature recommendations

3. **Behavioral Insights**
   - Correlation analysis (usage vs success)
   - Feature adoption tracking  
   - User satisfaction correlation
   - Churn prediction based on usage patterns