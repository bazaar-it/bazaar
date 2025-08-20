"use client";

import { useState, lazy, Suspense } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

// Lazy load the world map component to avoid SSR issues
const WorldMap = lazy(() => import('~/components/admin/WorldMap'));
import { 
  CalendarIcon, 
  TrendingUpIcon, 
  TrendingDownIcon, 
  TrendingDown,
  MinusIcon,
  Users,
  Video,
  Sparkles,
  Clock,
  Search,
  Activity,
  BarChart3,
  PieChart,
  TrendingUp,
  FileText,
  Download,
  MousePointer,
  DollarSign,
  Target
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

type Timeframe = '24h' | '7d' | '30d' | 'all';
type Metric = 'users' | 'projects' | 'scenes' | 'prompts';

const timeframeLabels = {
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  'all': 'All Time'
};

const metricLabels = {
  users: 'New Users',
  projects: 'Projects Created',
  scenes: 'Scenes Generated',
  prompts: 'Prompts Submitted'
};

const metricColors = {
  users: '#3B82F6', // blue
  projects: '#10B981', // green
  scenes: '#F59E0B', // yellow
  prompts: '#8B5CF6' // purple
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

// Mock data for demonstration - replace with real API calls
const generateMockGrowthData = (timeframe: Timeframe) => {
  const points = timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : 30;
  const data = [];
  const now = new Date();
  
  for (let i = points - 1; i >= 0; i--) {
    const date = new Date(now);
    if (timeframe === '24h') {
      date.setHours(date.getHours() - i);
    } else {
      date.setDate(date.getDate() - i);
    }
    
    data.push({
      date: timeframe === '24h' ? date.toLocaleTimeString('en-US', { hour: '2-digit' }) : 
            date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: Math.floor(Math.random() * 50) + 10,
      projects: Math.floor(Math.random() * 100) + 20,
      scenes: Math.floor(Math.random() * 200) + 50,
      prompts: Math.floor(Math.random() * 150) + 30,
    });
  }
  
  return data;
};

const generateConversionFunnelData = () => [
  { stage: 'Visitors', value: 10000, percentage: 100 },
  { stage: 'Sign Ups', value: 3500, percentage: 35 },
  { stage: 'First Video', value: 2100, percentage: 21 },
  { stage: 'Exported', value: 850, percentage: 8.5 },
  { stage: 'Paid Users', value: 120, percentage: 1.2 },
];

const generateTemplateUsageData = () => [
  { name: 'Floating Particles', usage: 450, percentage: 28 },
  { name: 'Text Animation', usage: 380, percentage: 24 },
  { name: 'Logo Reveal', usage: 290, percentage: 18 },
  { name: 'Social Media', usage: 220, percentage: 14 },
  { name: 'Slideshow', usage: 160, percentage: 10 },
  { name: 'Others', usage: 100, percentage: 6 },
];

const generateHeatmapData = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const data: Array<{
    day: string;
    hour: string;
    dayIndex: number;
    hourIndex: number;
    value: number;
  }> = [];
  
  days.forEach((day, dayIndex) => {
    hours.forEach(hour => {
      data.push({
        day,
        hour: hour.toString().padStart(2, '0') + ':00',
        dayIndex,
        hourIndex: hour,
        value: Math.floor(Math.random() * 100),
      });
    });
  });
  
  return data;
};

const generateGeographicData = () => [
  { country: 'United States', users: 4523, percentage: 35 },
  { country: 'United Kingdom', users: 2156, percentage: 17 },
  { country: 'Germany', users: 1890, percentage: 15 },
  { country: 'France', users: 1234, percentage: 10 },
  { country: 'Canada', users: 987, percentage: 8 },
  { country: 'Australia', users: 756, percentage: 6 },
  { country: 'Japan', users: 654, percentage: 5 },
  { country: 'Others', users: 543, percentage: 4 },
];

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Check admin access
  const { data: adminCheck, isLoading: adminCheckLoading } = api.admin.checkAdminAccess.useQuery();

  // Get real data from API
  const { data: dashboardMetrics } = api.admin.getDashboardMetrics.useQuery(
    undefined,
    { enabled: adminCheck?.isAdmin === true }
  );

  const { data: analyticsData } = api.admin.getAnalyticsData.useQuery(
    { timeframe: selectedTimeframe === 'all' ? '30d' : selectedTimeframe, metric: 'users' },
    { enabled: adminCheck?.isAdmin === true }
  );
  
  // Get real country data from Google Analytics
  const { data: gaCountryData, isLoading: gaLoading } = api.googleAnalytics.getCountryData.useQuery(
    { timeframe: selectedTimeframe === '30d' ? '30d' : '7d' },
    { 
      enabled: adminCheck?.isAdmin === true,
      refetchInterval: 300000 // Refresh every 5 minutes
    }
  );
  
  // Get real page views data from Google Analytics
  const { data: gaPageViews } = api.googleAnalytics.getPageViews.useQuery(
    { timeframe: selectedTimeframe === '30d' ? '30d' : '7d' },
    { 
      enabled: adminCheck?.isAdmin === true,
      refetchInterval: 300000 // Refresh every 5 minutes
    }
  );
  
  // Get real traffic sources from Google Analytics
  const { data: gaTrafficSources } = api.googleAnalytics.getTrafficSources.useQuery(
    { timeframe: selectedTimeframe === '30d' ? '30d' : '7d' },
    { 
      enabled: adminCheck?.isAdmin === true,
      refetchInterval: 300000 // Refresh every 5 minutes
    }
  );
  
  // Get real device categories from Google Analytics
  const { data: gaDevices } = api.googleAnalytics.getDeviceCategories.useQuery(
    { timeframe: selectedTimeframe === '30d' ? '30d' : '7d' },
    { 
      enabled: adminCheck?.isAdmin === true,
      refetchInterval: 300000 // Refresh every 5 minutes
    }
  );
  
  // Get real-time users from Google Analytics
  const { data: gaRealtimeUsers } = api.googleAnalytics.getRealtimeUsers.useQuery(
    undefined,
    { 
      enabled: adminCheck?.isAdmin === true,
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );
  
  // Get time series data from Google Analytics
  const { data: gaTimeSeries } = api.googleAnalytics.getTimeSeries.useQuery(
    { 
      timeframe: selectedTimeframe === '30d' ? '30d' : '7d',
      metric: 'users'
    },
    { 
      enabled: adminCheck?.isAdmin === true,
      refetchInterval: 300000 // Refresh every 5 minutes
    }
  );

  // Get user engagement statistics
  const { data: engagementStats } = api.admin.getUserEngagementStats.useQuery(
    undefined,
    { 
      enabled: adminCheck?.isAdmin === true,
      refetchInterval: 300000 // Refresh every 5 minutes
    }
  );

  // Handle authentication and admin access
  if (status === "loading" || adminCheckLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session?.user) {
    redirect('/login');
  }

  if (!adminCheck?.isAdmin) {
    redirect('/admin');
  }

  // Generate mock data for demonstration
  const funnelData = generateConversionFunnelData();
  const templateData = generateTemplateUsageData();
  const heatmapData = generateHeatmapData();
  
  // Use real time series data for growth chart if available
  const growthData = gaTimeSeries?.data && gaTimeSeries.data.length > 0
    ? gaTimeSeries.data.map(item => ({
        date: item.date,
        users: item.value,
        projects: Math.floor(Math.random() * 20) + 5, // Still mock for projects
        scenes: Math.floor(Math.random() * 30) + 10, // Still mock for scenes
        prompts: Math.floor(Math.random() * 40) + 15 // Still mock for prompts
      }))
    : generateMockGrowthData(selectedTimeframe);
  
  // Use real Google Analytics data for countries if available, otherwise use mock data
  const geoData = gaCountryData?.countries && gaCountryData.countries.length > 0
    ? gaCountryData.countries.map(country => ({
        country: country.country,
        users: country.visitors,
        percentage: country.percentage
      }))
    : generateGeographicData();
    
  // Use real page views data if available
  const pageViewsData = gaPageViews?.pages && gaPageViews.pages.length > 0
    ? gaPageViews.pages
    : [];
    
  // Use real traffic sources if available
  const trafficSourcesData = gaTrafficSources?.sources && gaTrafficSources.sources.length > 0
    ? gaTrafficSources.sources
    : [];
    
  // Use real device data if available
  const deviceData = gaDevices?.devices && gaDevices.devices.length > 0
    ? gaDevices.devices
    : [];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Funnel chart custom shape
  const CustomFunnelLabel = ({ x, y, width, height, value, percentage }: any) => {
    return (
      <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle">
        <tspan x={x + width / 2} dy="-0.1em" fontSize="14" fontWeight="600">
          {value.toLocaleString()}
        </tspan>
        <tspan x={x + width / 2} dy="1.2em" fontSize="12">
          ({percentage}%)
        </tspan>
      </text>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your platform performance
          </p>
          
          {/* ⚠️ HUGE WARNING ABOUT MOCK DATA ⚠️ */}
          <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ THIS IS MOCK DATA ⚠️</strong>
                </p>
                <p className="mt-1 text-sm text-yellow-700">
                  <strong>Jack or Ola</strong> - if you are reading this, this is <strong>NOT REAL DATA</strong>. 
                  We are making these charts at the moment, but need to update the production database 
                  for the new API endpoints detection. Only the top 4 metric cards show real data from the API.
                  Everything else (charts, funnel, geographic data, heatmap, revenue) is completely fake/hardcoded 
                  for design purposes only. 
                </p>
                <p className="mt-2 text-xs text-yellow-600 font-mono">
                  Real API calls: dashboardMetrics (users/scenes/prompts) | 
                  Fake data: generateMockGrowthData(), generateConversionFunnelData(), 
                  generateTemplateUsageData(), generateHeatmapData(), generateGeographicData()
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex items-center gap-4">
        <div className="flex bg-muted rounded-lg p-1">
          {(['24h', '7d', '30d', 'all'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {timeframeLabels[timeframe]}
            </button>
          ))}
        </div>
        <Badge variant="outline" className="ml-auto">
          <Activity className="h-3 w-3 mr-1" />
          {gaRealtimeUsers?.activeUsers || 0} Live Users
        </Badge>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics?.users.all || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardMetrics?.users.last7Days || 0} this week
            </p>
            <div className="mt-2 h-[60px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData.slice(-7)}>
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Created</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics?.scenes.all || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardMetrics?.scenes.last7Days || 0} this week
            </p>
            <div className="mt-2 h-[60px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData.slice(-7)}>
                  <Line 
                    type="monotone" 
                    dataKey="scenes" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Prompts</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics?.prompts.all || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardMetrics?.prompts.last7Days || 0} this week
            </p>
            <div className="mt-2 h-[60px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData.slice(-7)}>
                  <Line 
                    type="monotone" 
                    dataKey="prompts" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Export Rate</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24.5%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1 text-green-500" />
              +2.3% from last week
            </p>
            <div className="mt-2 h-[60px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData.slice(-7)}>
                  <Line 
                    type="monotone" 
                    dataKey="projects" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Growth Trends */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Growth Trends</CardTitle>
                  <CardDescription>
                    Platform activity over {timeframeLabels[selectedTimeframe].toLowerCase()}
                  </CardDescription>
                </div>
                {gaTimeSeries?.data && gaTimeSeries.data.length > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    <Activity className="h-3 w-3 mr-1" />
                    Live GA Data
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorScenes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPrompts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="users" stroke="#3B82F6" fillOpacity={1} fill="url(#colorUsers)" />
                    <Area type="monotone" dataKey="projects" stroke="#10B981" fillOpacity={1} fill="url(#colorProjects)" />
                    <Area type="monotone" dataKey="scenes" stroke="#F59E0B" fillOpacity={1} fill="url(#colorScenes)" />
                    <Area type="monotone" dataKey="prompts" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorPrompts)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Conversion Funnel</CardTitle>
                    <CardDescription>User journey from signup to paid</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    MOCK DATA
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnelData.map((stage, index) => {
                    const widthPercentage = (stage.value / (funnelData[0]?.value || 1)) * 100;
                    return (
                      <div key={stage.stage} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{stage.stage}</span>
                          <span className="text-muted-foreground">
                            {stage.value.toLocaleString()} ({stage.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-8 overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                            style={{
                              width: `${widthPercentage}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          >
                            {index > 0 && funnelData[index - 1] && (
                              <span className="text-xs text-white font-medium">
                                {Math.round((stage.value / (funnelData[index - 1]?.value || 1)) * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Popular Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Templates</CardTitle>
                <CardDescription>Most used video templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={templateData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="usage"
                      >
                        {templateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {/* User Engagement Insights */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Engagement Insights</CardTitle>
                  <CardDescription>Understanding user behavior and drop-off points</CardDescription>
                </div>
                {engagementStats && (
                  <Badge variant="default" className="bg-green-500">
                    <Activity className="h-3 w-3 mr-1" />
                    Live Data
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Users who never returned */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Never Returned After Signup</span>
                    <Badge variant="destructive">Critical</Badge>
                  </div>
                  <div className="text-3xl font-bold">
                    {engagementStats?.engagement.usersNeverReturnedPercentage || '0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {engagementStats?.engagement.usersNeverReturned || 0} of {engagementStats?.totalUsers || 0} users
                  </p>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: `${engagementStats?.engagement.usersNeverReturnedPercentage || 0}%` }}
                    />
                  </div>
                </div>

                {/* Users with no prompts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Signed Up, No Prompts</span>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">Warning</Badge>
                  </div>
                  <div className="text-3xl font-bold">
                    {engagementStats?.engagement.usersNoPromptsPercentage || '0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {engagementStats?.engagement.usersNoPrompts || 0} users never submitted a prompt
                  </p>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${engagementStats?.engagement.usersNoPromptsPercentage || 0}%` }}
                    />
                  </div>
                </div>

                {/* Users who never used templates */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Never Used Templates</span>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Info</Badge>
                  </div>
                  <div className="text-3xl font-bold">
                    {engagementStats?.engagement.usersNoTemplatesPercentage || '0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {engagementStats?.engagement.usersNoTemplates || 0} users started from scratch
                  </p>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all"
                      style={{ width: `${engagementStats?.engagement.usersNoTemplatesPercentage || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Prompt submission breakdown */}
              <div className="mt-8">
                <h4 className="text-sm font-semibold mb-4">Detailed Prompt Submission Distribution</h4>
                <div className="space-y-3">
                  {[
                    { range: '0', label: 'No Prompts', color: 'red', key: 'usersNoPrompts' },
                    { range: '1-4', label: 'Under 5 Prompts', color: 'orange', key: 'usersUnder5Prompts' },
                    { range: '5-10', label: '5-10 Prompts', color: 'yellow', key: 'users5To10Prompts' },
                    { range: '11-20', label: '11-20 Prompts', color: 'lime', key: 'users10To20Prompts' },
                    { range: '21-50', label: '21-50 Prompts', color: 'green', key: 'users20To50Prompts' },
                    { range: '51-100', label: '51-100 Prompts', color: 'emerald', key: 'users50To100Prompts' },
                    { range: '101-200', label: '101-200 Prompts', color: 'teal', key: 'users100To200Prompts' },
                    { range: '201-500', label: '201-500 Prompts', color: 'blue', key: 'users200To500Prompts' },
                    { range: '500+', label: 'Super Users (500+)', color: 'purple', key: 'usersOver500Prompts' },
                  ].map((item) => {
                    const count = engagementStats?.engagement[item.key as keyof typeof engagementStats.engagement] || 0;
                    const percentage = engagementStats?.engagement[`${item.key}Percentage` as keyof typeof engagementStats.engagement] || '0';
                    const colorClass = {
                      red: 'bg-red-100 text-red-700',
                      orange: 'bg-orange-100 text-orange-700',
                      yellow: 'bg-yellow-100 text-yellow-700',
                      lime: 'bg-lime-100 text-lime-700',
                      green: 'bg-green-100 text-green-700',
                      emerald: 'bg-emerald-100 text-emerald-700',
                      teal: 'bg-teal-100 text-teal-700',
                      blue: 'bg-blue-100 text-blue-700',
                      purple: 'bg-purple-100 text-purple-700',
                    }[item.color];

                    return (
                      <div key={item.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
                            <span className="text-xs font-bold">{item.range}</span>
                          </div>
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{percentage}%</p>
                          <p className="text-xs text-muted-foreground">{count} users</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Days Distribution */}
              <div className="mt-8">
                <h4 className="text-sm font-semibold mb-4">User Activity Days Distribution</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Days Active</CardTitle>
                      <CardDescription className="text-xs">How many different days users submitted prompts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { label: '1 Day Only', key: 'usersActive1Day' },
                          { label: '2 Days', key: 'usersActive2Days' },
                          { label: '3-5 Days', key: 'usersActive3To5Days' },
                          { label: '6-10 Days', key: 'usersActive6To10Days' },
                          { label: '11-30 Days', key: 'usersActive11To30Days' },
                          { label: '30+ Days', key: 'usersActiveOver30Days' },
                        ].map((item) => {
                          const count = engagementStats?.activeDays?.[item.key as keyof typeof engagementStats.activeDays] || 0;
                          const percentage = engagementStats?.activeDays?.[`${item.key}Percentage` as keyof typeof engagementStats.activeDays] || '0';
                          
                          return (
                            <div key={item.key} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span>{item.label}</span>
                                <span className="font-medium">{count} users ({percentage}%)</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Days Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Activity Days Chart</CardTitle>
                      <CardDescription className="text-xs">Distribution of users by active days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        {engagementStats?.activeDays?.distribution && (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={Object.entries(engagementStats.activeDays.distribution).map(([days, count]) => ({
                                days: parseInt(days),
                                users: count
                              })).sort((a, b) => a.days - b.days)}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="days" label={{ value: 'Days Active', position: 'insideBottom', offset: -5 }} />
                              <YAxis label={{ value: 'Users', angle: -90, position: 'insideLeft' }} />
                              <Tooltip />
                              <Bar dataKey="users" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Retention metrics */}
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Day 1 Retention</span>
                    <Badge variant={Number(engagementStats?.retention.dayRetentionRate) > 50 ? "default" : "destructive"}>
                      {engagementStats?.retention.dayRetentionRate || '0'}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {engagementStats?.retention.retainedAfterDay || 0} of {engagementStats?.retention.eligibleForDayRetention || 0} users came back after first day
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Week 1 Retention</span>
                    <Badge variant={Number(engagementStats?.retention.weekRetentionRate) > 30 ? "default" : "destructive"}>
                      {engagementStats?.retention.weekRetentionRate || '0'}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {engagementStats?.retention.retainedAfterWeek || 0} of {engagementStats?.retention.eligibleForWeekRetention || 0} users active after first week
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Geographic Distribution with World Map */}
          <Card className="col-span-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>User distribution by country</CardDescription>
                </div>
                {gaCountryData?.countries && gaCountryData.countries.length > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    <Activity className="h-3 w-3 mr-1" />
                    Live GA Data
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* World Map Visualization */}
              {geoData.length > 0 && (
                <div className="mb-8">
                  <Suspense fallback={
                    <div className="h-[400px] flex items-center justify-center bg-muted/10 rounded-lg">
                      <div className="text-muted-foreground">Loading world map...</div>
                    </div>
                  }>
                    <WorldMap data={geoData} height={400} />
                  </Suspense>
                </div>
              )}
              
              {/* Country breakdown with chart and list */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={geoData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis dataKey="country" type="category" width={100} className="text-xs" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="users" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {geoData.map((country, index) => (
                    <div key={country.country} className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-semibold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{country.country}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{country.users.toLocaleString()} visitors</p>
                        <p className="text-xs text-muted-foreground">{country.percentage}% of total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Activity Heatmap */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Peak Usage Hours</CardTitle>
                  <CardDescription>Activity heatmap by day and hour</CardDescription>
                </div>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  MOCK DATA
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-25 gap-1">
                    <div className="col-span-1"></div>
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} className="text-xs text-center text-muted-foreground">
                        {i.toString().padStart(2, '0')}
                      </div>
                    ))}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
                      <>
                        <div key={day} className="text-xs text-right pr-2 text-muted-foreground">
                          {day}
                        </div>
                        {Array.from({ length: 24 }, (_, hourIndex) => {
                          const dataPoint = heatmapData.find(
                            d => d.dayIndex === dayIndex && d.hourIndex === hourIndex
                          );
                          const intensity = dataPoint ? dataPoint.value / 100 : 0;
                          return (
                            <div
                              key={`${dayIndex}-${hourIndex}`}
                              className="aspect-square rounded-sm transition-all hover:ring-2 hover:ring-primary"
                              style={{
                                backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                              }}
                              title={`${day} ${hourIndex}:00 - ${dataPoint?.value || 0} activities`}
                            />
                          );
                        })}
                      </>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <span className="text-xs text-muted-foreground">Less</span>
                    <div className="flex gap-1">
                      {[0.1, 0.3, 0.5, 0.7, 0.9].map(intensity => (
                        <div
                          key={intensity}
                          className="w-4 h-4 rounded-sm"
                          style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">More</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {/* Page Views */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Pages</CardTitle>
                  <CardDescription>Most visited pages on your site</CardDescription>
                </div>
                {pageViewsData.length > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    <Activity className="h-3 w-3 mr-1" />
                    Live GA Data
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pageViewsData.length > 0 ? (
                  pageViewsData.slice(0, 10).map((page, index) => (
                    <div key={page.page} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{page.page}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{page.views} views</span>
                          <span className="text-xs text-muted-foreground ml-2">({page.visitors} visitors)</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((page.views / (pageViewsData[0]?.views || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No page view data available</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Scene Generation Stats */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Content Generation Statistics</CardTitle>
                  <CardDescription>AI-generated scenes and templates usage</CardDescription>
                </div>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  MOCK DATA
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="scenes" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="prompts" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Template Performance */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Template Performance</CardTitle>
                    <CardDescription>Usage vs Export rate</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    MOCK DATA
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={templateData.slice(0, 5)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" className="text-xs" />
                      <PolarRadiusAxis />
                      <Radar name="Usage" dataKey="usage" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Formats</CardTitle>
                <CardDescription>Popular export formats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { format: 'MP4 (1080p)', count: 2345, percentage: 45 },
                    { format: 'MP4 (720p)', count: 1567, percentage: 30 },
                    { format: 'WebM', count: 782, percentage: 15 },
                    { format: 'GIF', count: 521, percentage: 10 },
                  ].map(format => (
                    <div key={format.format} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{format.format}</span>
                        <span className="text-sm text-muted-foreground">{format.count}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${format.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          {/* Traffic Sources */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Traffic Sources</CardTitle>
                  <CardDescription>Where your visitors come from</CardDescription>
                </div>
                {trafficSourcesData.length > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    <Activity className="h-3 w-3 mr-1" />
                    Live GA Data
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-[300px]">
                  {trafficSourcesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={trafficSourcesData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ source, percentage }) => `${source} (${percentage}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="sessions"
                        >
                          {trafficSourcesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No traffic data available
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {trafficSourcesData.map((source, index) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{source.source}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{source.sessions} sessions</p>
                        <p className="text-xs text-muted-foreground">
                          {source.visitors} visitors • {source.bounceRate}% bounce
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Device Categories</CardTitle>
                  <CardDescription>Visitor devices breakdown</CardDescription>
                </div>
                {deviceData.length > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    <Activity className="h-3 w-3 mr-1" />
                    Live GA Data
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-[300px]">
                  {deviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deviceData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="device" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="users" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No device data available
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {deviceData.map((device, index) => (
                    <div key={device.device} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{device.device}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{device.users} users</p>
                        <p className="text-xs text-muted-foreground">{device.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* User Engagement Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Avg. Session Duration</CardTitle>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                    MOCK
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">12m 34s</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <TrendingUp className="h-3 w-3 inline mr-1 text-green-500" />
                  +1m 23s from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bounce Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">32.4%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <TrendingDown className="h-3 w-3 inline mr-1 text-green-500" />
                  -2.1% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pages per Session</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">5.7</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <TrendingUp className="h-3 w-3 inline mr-1 text-green-500" />
                  +0.3 from last week
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Feature Adoption */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Adoption</CardTitle>
              <CardDescription>User engagement with platform features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { feature: 'AI Scene Generation', users: 3456, adoption: 78 },
                  { feature: 'Voice Commands', users: 2103, adoption: 47 },
                  { feature: 'Image Upload', users: 1876, adoption: 42 },
                  { feature: 'Template Library', users: 2987, adoption: 67 },
                  { feature: 'Export to MP4', users: 1234, adoption: 28 },
                  { feature: 'Collaboration', users: 567, adoption: 13 },
                ].map(feature => (
                  <div key={feature.feature} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{feature.feature}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{feature.users.toLocaleString()} users</span>
                        <span className="text-xs text-muted-foreground ml-2">({feature.adoption}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${feature.adoption}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          {/* Revenue Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$12,345</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1 text-green-500" />
                  +15% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paying Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">124</div>
                <p className="text-xs text-muted-foreground">
                  3.5% conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ARPU</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$99.56</div>
                <p className="text-xs text-muted-foreground">
                  Average revenue per user
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5.2%</div>
                <p className="text-xs text-muted-foreground">
                  Monthly churn
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly recurring revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="projects" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      dot={{ fill: '#10B981', r: 4 }}
                      name="Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}