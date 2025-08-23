import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';

// Google Analytics Data API v1 types
interface Dimension {
  name: string;
}

interface Metric {
  name: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DimensionHeader {
  name: string;
}

interface MetricHeader {
  name: string;
  type: string;
}

interface Row {
  dimensionValues: Array<{ value: string }>;
  metricValues: Array<{ value: string }>;
}

interface RunReportResponse {
  dimensionHeaders?: DimensionHeader[];
  metricHeaders?: MetricHeader[];
  rows?: Row[];
  rowCount?: number;
}

class GoogleAnalyticsService {
  private analyticsDataClient: BetaAnalyticsDataClient | null = null;
  private propertyId: string;
  private isConfigured: boolean = false;

  constructor() {
    // Get GA property ID from environment
    this.propertyId = process.env.GA_PROPERTY_ID || '';
    
    // Check if Google Analytics is configured
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const clientEmail = process.env.GA_CLIENT_EMAIL;
    const privateKey = process.env.GA_PRIVATE_KEY;
    
    if (!this.propertyId) {
      console.warn('[Google Analytics] GA_PROPERTY_ID not configured');
      return;
    }

    try {
      if (credentials) {
        // Use service account JSON file
        this.analyticsDataClient = new BetaAnalyticsDataClient({
          keyFilename: credentials
        });
        this.isConfigured = true;
      } else if (clientEmail && privateKey) {
        // Use individual credentials
        this.analyticsDataClient = new BetaAnalyticsDataClient({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
          }
        });
        this.isConfigured = true;
      } else {
        console.warn('[Google Analytics] No authentication configured. Set either GOOGLE_APPLICATION_CREDENTIALS or GA_CLIENT_EMAIL + GA_PRIVATE_KEY');
      }
    } catch (error) {
      console.error('[Google Analytics] Failed to initialize client:', error);
    }
  }

  private getDateRange(timeframe: '24h' | '7d' | '30d'): DateRange {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }
    
    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
    };
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!; // YYYY-MM-DD format
  }

  async getCountryData(timeframe: '7d' | '30d' = '7d') {
    if (!this.isConfigured || !this.analyticsDataClient) {
      console.warn('[Google Analytics] Service not configured, returning empty data');
      return { countries: [], totalVisitors: 0 };
    }

    try {
      const dateRange = this.getDateRange(timeframe);
      
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'country' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' }
        ],
        orderBys: [
          {
            metric: { metricName: 'activeUsers' },
            desc: true
          }
        ],
        limit: 20
      });

      const countries = this.processCountryResponse(response as any);
      const totalVisitors = countries.reduce((sum, c) => sum + c.visitors, 0);
      
      return { countries, totalVisitors };
    } catch (error) {
      console.error('[Google Analytics] Error fetching country data:', error);
      return { countries: [], totalVisitors: 0 };
    }
  }

  private processCountryResponse(response: RunReportResponse) {
    if (!response.rows) return [];

    const totalVisitors = response.rows.reduce((sum, row) => {
      const visitors = parseInt(row.metricValues?.[0]?.value || '0');
      return sum + visitors;
    }, 0);

    return response.rows.map(row => {
      const country = row.dimensionValues?.[0]?.value || 'Unknown';
      const visitors = parseInt(row.metricValues?.[0]?.value || '0');
      const sessions = parseInt(row.metricValues?.[1]?.value || '0');
      const pageViews = parseInt(row.metricValues?.[2]?.value || '0');
      
      return {
        country,
        visitors,
        sessions,
        pageViews,
        percentage: totalVisitors > 0 ? Math.round((visitors / totalVisitors) * 100) : 0
      };
    });
  }

  async getPageViews(timeframe: '7d' | '30d' = '7d') {
    if (!this.isConfigured || !this.analyticsDataClient) {
      return { pages: [], totalPageViews: 0 };
    }

    try {
      const dateRange = this.getDateRange(timeframe);
      
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' }
        ],
        orderBys: [
          {
            metric: { metricName: 'screenPageViews' },
            desc: true
          }
        ],
        limit: 15
      });

      const pages = this.processPageViewsResponse(response as any);
      const totalPageViews = pages.reduce((sum, p) => sum + p.views, 0);
      
      return { pages, totalPageViews };
    } catch (error) {
      console.error('[Google Analytics] Error fetching page views:', error);
      return { pages: [], totalPageViews: 0 };
    }
  }

  private processPageViewsResponse(response: RunReportResponse) {
    if (!response.rows) return [];

    return response.rows.map(row => {
      const page = row.dimensionValues?.[0]?.value || '/';
      const visitors = parseInt(row.metricValues?.[0]?.value || '0');
      const views = parseInt(row.metricValues?.[1]?.value || '0');
      const avgDuration = parseFloat(row.metricValues?.[2]?.value || '0');
      
      return {
        page,
        visitors,
        views,
        avgDuration: Math.round(avgDuration)
      };
    });
  }

  async getTrafficSources(timeframe: '7d' | '30d' = '7d') {
    if (!this.isConfigured || !this.analyticsDataClient) {
      return { sources: [], totalSessions: 0 };
    }

    try {
      const dateRange = this.getDateRange(timeframe);
      
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'bounceRate' }
        ],
        orderBys: [
          {
            metric: { metricName: 'sessions' },
            desc: true
          }
        ]
      });

      const sources = this.processTrafficSourcesResponse(response as any);
      const totalSessions = sources.reduce((sum, s) => sum + s.sessions, 0);
      
      return { sources, totalSessions };
    } catch (error) {
      console.error('[Google Analytics] Error fetching traffic sources:', error);
      return { sources: [], totalSessions: 0 };
    }
  }

  private processTrafficSourcesResponse(response: RunReportResponse) {
    if (!response.rows) return [];

    const totalSessions = response.rows.reduce((sum, row) => {
      const sessions = parseInt(row.metricValues?.[1]?.value || '0');
      return sum + sessions;
    }, 0);

    return response.rows.map(row => {
      const source = row.dimensionValues?.[0]?.value || 'Unknown';
      const visitors = parseInt(row.metricValues?.[0]?.value || '0');
      const sessions = parseInt(row.metricValues?.[1]?.value || '0');
      const bounceRate = parseFloat(row.metricValues?.[2]?.value || '0');
      
      return {
        source,
        visitors,
        sessions,
        bounceRate: Math.round(bounceRate * 100) / 100,
        percentage: totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0
      };
    });
  }

  async getDeviceCategories(timeframe: '7d' | '30d' = '7d') {
    if (!this.isConfigured || !this.analyticsDataClient) {
      return { devices: [], totalUsers: 0 };
    }

    try {
      const dateRange = this.getDateRange(timeframe);
      
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' }
        ],
        orderBys: [
          {
            metric: { metricName: 'activeUsers' },
            desc: true
          }
        ]
      });

      const devices = this.processDeviceResponse(response as any);
      const totalUsers = devices.reduce((sum, d) => sum + d.users, 0);
      
      return { devices, totalUsers };
    } catch (error) {
      console.error('[Google Analytics] Error fetching device data:', error);
      return { devices: [], totalUsers: 0 };
    }
  }

  private processDeviceResponse(response: RunReportResponse) {
    if (!response.rows) return [];

    const totalUsers = response.rows.reduce((sum, row) => {
      const users = parseInt(row.metricValues?.[0]?.value || '0');
      return sum + users;
    }, 0);

    return response.rows.map(row => {
      const device = row.dimensionValues?.[0]?.value || 'Unknown';
      const users = parseInt(row.metricValues?.[0]?.value || '0');
      const sessions = parseInt(row.metricValues?.[1]?.value || '0');
      
      return {
        device: device.charAt(0).toUpperCase() + device.slice(1), // Capitalize
        users,
        sessions,
        percentage: totalUsers > 0 ? Math.round((users / totalUsers) * 100) : 0
      };
    });
  }

  async getRealtimeUsers() {
    if (!this.isConfigured || !this.analyticsDataClient) {
      return { activeUsers: 0 };
    }

    try {
      const [response] = await this.analyticsDataClient.runRealtimeReport({
        property: `properties/${this.propertyId}`,
        metrics: [{ name: 'activeUsers' }]
      });

      const activeUsers = parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0');
      return { activeUsers };
    } catch (error) {
      console.error('[Google Analytics] Error fetching realtime users:', error);
      return { activeUsers: 0 };
    }
  }

  async getTimeSeries(timeframe: '7d' | '30d' = '7d', metric: 'users' | 'sessions' | 'pageViews' = 'users') {
    if (!this.isConfigured || !this.analyticsDataClient) {
      return { data: [] };
    }

    try {
      const dateRange = this.getDateRange(timeframe);
      
      // Map metric names to GA4 metrics
      const metricMap = {
        users: 'activeUsers',
        sessions: 'sessions',
        pageViews: 'screenPageViews'
      };
      
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: metricMap[metric] }],
        orderBys: [
          {
            dimension: { dimensionName: 'date' },
            desc: false
          }
        ]
      });

      const data = this.processTimeSeriesResponse(response as any);
      return { data };
    } catch (error) {
      console.error('[Google Analytics] Error fetching time series:', error);
      return { data: [] };
    }
  }

  private processTimeSeriesResponse(response: RunReportResponse) {
    if (!response.rows) return [];

    return response.rows.map(row => {
      const dateStr = row.dimensionValues?.[0]?.value || '';
      const value = parseInt(row.metricValues?.[0]?.value || '0');
      
      // Parse YYYYMMDD format to Date
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      const date = new Date(year, month, day);
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: date.getTime(),
        value
      };
    });
  }

  // Check if service is properly configured
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

export const googleAnalyticsService = new GoogleAnalyticsService();