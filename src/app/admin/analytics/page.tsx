"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
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

type Timeframe = '24h' | '7d' | '30d';
type Metric = 'users' | 'projects' | 'scenes' | 'prompts';

const timeframeLabels = {
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days'
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
  const data = [];
  
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

  const { data: analyticsData } = api.admin.getAnalyticsChart.useQuery(
    { timeframe: selectedTimeframe, metric: 'users' },
    { enabled: adminCheck?.isAdmin === true }
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
  const growthData = generateMockGrowthData(selectedTimeframe);
  const funnelData = generateConversionFunnelData();
  const templateData = generateTemplateUsageData();
  const heatmapData = generateHeatmapData();
  const geoData = generateGeographicData();

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
          {(['24h', '7d', '30d'] as const).map((timeframe) => (
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
          Live Data
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
              <CardTitle>Growth Trends</CardTitle>
              <CardDescription>
                Platform activity over {timeframeLabels[selectedTimeframe].toLowerCase()}
              </CardDescription>
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
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>User journey from signup to paid</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnelData.map((stage, index) => {
                    const widthPercentage = (stage.value / funnelData[0].value) * 100;
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
                            {index > 0 && (
                              <span className="text-xs text-white font-medium">
                                {Math.round((stage.value / funnelData[index - 1].value) * 100)}%
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
          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>User distribution by country</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={geoData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis dataKey="country" type="category" width={100} className="text-xs" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="users" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {geoData.map((country, index) => (
                    <div key={country.country} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{country.country}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{country.users.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{country.percentage}%</p>
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
              <CardTitle>Peak Usage Hours</CardTitle>
              <CardDescription>Activity heatmap by day and hour</CardDescription>
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
          {/* Scene Generation Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Content Generation Statistics</CardTitle>
              <CardDescription>AI-generated scenes and templates usage</CardDescription>
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
                <CardTitle>Template Performance</CardTitle>
                <CardDescription>Usage vs Export rate</CardDescription>
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
          {/* User Engagement Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Avg. Session Duration</CardTitle>
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