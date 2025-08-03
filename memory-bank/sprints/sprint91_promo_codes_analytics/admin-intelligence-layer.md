# Admin Intelligence Layer Design

## Overview

Transform the admin interface from basic CRUD operations to an intelligent analytics platform with natural language query capabilities and advanced filtering.

## Current Limitations

- No project search by ID
- Basic table views without filtering
- Manual SQL queries for insights
- No trend analysis
- Limited promo code tracking

## Proposed Features

### 1. Intelligent Search Interface

```typescript
interface IntelligentSearch {
  // Natural language to SQL
  query: (question: string) => Promise<QueryResult>;
  
  // Suggested questions based on context
  suggestions: (context: AdminContext) => string[];
  
  // Query history and favorites
  history: QueryHistory[];
  favorites: SavedQuery[];
}

// Example Component
function AdminSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [suggestions] = useState([
    "How many projects were created last week?",
    "Show users who signed up but never created a project",
    "Which users have hit their credit limit?",
    "What's the conversion rate from signup to first project?",
    "Find all projects using audio features"
  ]);
  
  const handleSearch = async () => {
    if (query.startsWith('project:')) {
      // Direct project ID search
      const projectId = query.replace('project:', '').trim();
      await searchProjectById(projectId);
    } else {
      // Natural language query
      const sql = await convertToSQL(query);
      const results = await executeQuery(sql);
      setResults(results);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about your data..."
          className="flex-1"
        />
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>
      
      {!query && (
        <div className="grid grid-cols-2 gap-2">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className="text-left p-2 text-sm hover:bg-gray-50 rounded"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      
      {results && <QueryResults data={results} />}
    </div>
  );
}
```

### 2. Natural Language to SQL Engine

```typescript
class NaturalLanguageSQL {
  private schema = {
    users: ['id', 'email', 'name', 'created_at', 'credits'],
    projects: ['id', 'user_id', 'title', 'created_at', 'updated_at'],
    scenes: ['id', 'project_id', 'name', 'duration', 'created_at'],
    messages: ['id', 'project_id', 'user_id', 'content', 'created_at'],
    promo_codes: ['id', 'code', 'discount_type', 'uses_count', 'max_uses'],
    promo_code_usage: ['id', 'promo_code_id', 'user_id', 'used_at']
  };
  
  async convertToSQL(question: string): Promise<string> {
    const prompt = `
      Convert this question to a PostgreSQL query:
      "${question}"
      
      Available tables and columns:
      ${JSON.stringify(this.schema, null, 2)}
      
      Rules:
      - Use "bazaar-vid_" prefix for all tables
      - Use proper date functions for time-based queries
      - Include appropriate JOINs when needed
      - Add ORDER BY and LIMIT when relevant
      - Return only the SQL query, no explanation
    `;
    
    const sql = await llm.generate(prompt);
    
    // Validate SQL before execution
    return this.validateAndSanitize(sql);
  }
  
  validateAndSanitize(sql: string): string {
    // Remove any DDL statements
    if (/(CREATE|DROP|ALTER|TRUNCATE)/i.test(sql)) {
      throw new Error("DDL statements not allowed");
    }
    
    // Ensure read-only
    if (/(INSERT|UPDATE|DELETE)/i.test(sql)) {
      throw new Error("Write operations not allowed");
    }
    
    // Add safety limits
    if (!sql.includes('LIMIT')) {
      sql += ' LIMIT 100';
    }
    
    return sql;
  }
}
```

### 3. Advanced Project Search

```typescript
interface ProjectSearchFilters {
  id?: string;
  userId?: string;
  title?: string;
  dateRange?: { from: Date; to: Date };
  hasScenes?: boolean;
  hasAudio?: boolean;
  minDuration?: number;
  maxDuration?: number;
  tags?: string[];
}

function ProjectSearchPanel() {
  const [filters, setFilters] = useState<ProjectSearchFilters>({});
  const [quickSearch, setQuickSearch] = useState("");
  
  // Quick search by ID (UUID detection)
  useEffect(() => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (isUUID.test(quickSearch)) {
      setFilters({ id: quickSearch });
      searchProjects({ id: quickSearch });
    }
  }, [quickSearch]);
  
  return (
    <div className="space-y-4">
      <Input
        value={quickSearch}
        onChange={(e) => setQuickSearch(e.target.value)}
        placeholder="Enter project ID or search term..."
      />
      
      <Collapsible>
        <CollapsibleTrigger>Advanced Filters</CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-2 gap-4">
            <DateRangePicker
              value={filters.dateRange}
              onChange={(range) => setFilters({...filters, dateRange: range})}
            />
            <Select
              value={filters.hasScenes}
              onChange={(val) => setFilters({...filters, hasScenes: val})}
            >
              <option value="">Any</option>
              <option value="true">With Scenes</option>
              <option value="false">Without Scenes</option>
            </Select>
            {/* More filters... */}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

### 4. Promo Code Analytics Dashboard

```typescript
interface PromoCodeAnalytics {
  overview: {
    totalCodes: number;
    activeCodes: number;
    totalUsage: number;
    totalDiscountGiven: number;
    averageDiscount: number;
  };
  
  topPerformers: Array<{
    code: string;
    usage: number;
    revenue: number;
    conversionRate: number;
  }>;
  
  trends: Array<{
    date: string;
    usage: number;
    revenue: number;
    newUsers: number;
  }>;
  
  userBehavior: {
    averageTimeToUse: number;
    repeatPurchaseRate: number;
    averageLTV: number;
  };
}

function PromoCodeDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const { data: analytics } = usePromoAnalytics(timeRange);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Overview Cards */}
      <Card>
        <CardHeader>Total Discount Given</CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            ${(analytics.overview.totalDiscountGiven / 100).toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            Across {analytics.overview.totalUsage} uses
          </div>
        </CardContent>
      </Card>
      
      {/* Usage Trend Chart */}
      <Card className="col-span-2">
        <CardHeader>Usage Trend</CardHeader>
        <CardContent>
          <LineChart data={analytics.trends} />
        </CardContent>
      </Card>
      
      {/* Top Performing Codes */}
      <Card>
        <CardHeader>Top Codes</CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.topPerformers.map(code => (
              <div key={code.code} className="flex justify-between">
                <span className="font-mono">{code.code}</span>
                <span>{code.usage} uses</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5. Intelligent Insights Engine

```typescript
class InsightsEngine {
  async generateInsights(): Promise<Insight[]> {
    const insights = [];
    
    // User behavior insights
    const churningUsers = await this.identifyChurningUsers();
    if (churningUsers.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Users at risk of churning',
        description: `${churningUsers.length} users haven't created projects in 30+ days`,
        action: 'Send re-engagement campaign',
        data: churningUsers
      });
    }
    
    // Revenue insights
    const revenueGrowth = await this.calculateRevenueGrowth();
    insights.push({
      type: revenueGrowth > 0 ? 'success' : 'warning',
      title: `Revenue ${revenueGrowth > 0 ? 'up' : 'down'} ${Math.abs(revenueGrowth)}%`,
      description: 'Compared to previous period',
      action: revenueGrowth < 0 ? 'Review pricing strategy' : null
    });
    
    // Usage insights
    const peakHours = await this.identifyPeakUsageHours();
    insights.push({
      type: 'info',
      title: 'Peak usage hours',
      description: `Most activity between ${peakHours.start}-${peakHours.end}`,
      action: 'Schedule maintenance outside these hours'
    });
    
    // Promo code insights
    const bestPromo = await this.getBestPerformingPromo();
    if (bestPromo) {
      insights.push({
        type: 'success',
        title: `"${bestPromo.code}" driving conversions`,
        description: `${bestPromo.conversionRate}% conversion rate`,
        action: 'Consider similar campaigns'
      });
    }
    
    return insights;
  }
}
```

## Implementation Plan

### Phase 1: Basic Search (Week 1)
- Project search by ID
- User search by email
- Basic filtering UI
- Export to CSV

### Phase 2: Natural Language Queries (Week 2)
- LLM integration for SQL generation
- Query validation and sanitization
- Results visualization
- Query history

### Phase 3: Analytics Dashboard (Week 3)
- Promo code analytics
- User behavior metrics
- Revenue tracking
- Trend analysis

### Phase 4: Intelligence Layer (Week 4)
- Automated insights generation
- Anomaly detection
- Predictive analytics
- Action recommendations

## Technical Architecture

```typescript
// API Routes
app.get('/api/admin/search', authenticate, searchHandler);
app.post('/api/admin/query', authenticate, naturalLanguageQuery);
app.get('/api/admin/insights', authenticate, getInsights);
app.get('/api/admin/analytics/promo', authenticate, getPromoAnalytics);

// Database Views for Performance
CREATE MATERIALIZED VIEW admin_user_metrics AS
SELECT 
  u.id,
  u.email,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT s.id) as scene_count,
  MAX(p.created_at) as last_project_date,
  u.credits as remaining_credits
FROM "bazaar-vid_user" u
LEFT JOIN "bazaar-vid_project" p ON u.id = p.user_id
LEFT JOIN "bazaar-vid_scene" s ON p.id = s.project_id
GROUP BY u.id;

// Refresh materialized views periodically
CREATE OR REPLACE FUNCTION refresh_admin_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_user_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_promo_metrics;
END;
$$ LANGUAGE plpgsql;
```

## Security Considerations

1. **Query Sanitization**: Prevent SQL injection in natural language queries
2. **Rate Limiting**: Limit expensive queries per admin
3. **Audit Logging**: Track all admin queries and actions
4. **Read-Only Access**: Ensure queries can't modify data
5. **Result Limits**: Automatic pagination for large results
6. **PII Protection**: Mask sensitive data in exports

## Performance Optimization

1. **Materialized Views**: Pre-compute expensive aggregations
2. **Query Caching**: Cache frequent queries for 5 minutes
3. **Pagination**: Limit results to 100 rows by default
4. **Indexed Columns**: Ensure proper indexes on search fields
5. **Background Jobs**: Run heavy analytics asynchronously

## Success Metrics

- 80% reduction in time to find specific data
- 90% of common questions answerable without SQL knowledge
- 50% increase in admin efficiency
- Zero security incidents from query interface
- <2 second response time for 95% of queries