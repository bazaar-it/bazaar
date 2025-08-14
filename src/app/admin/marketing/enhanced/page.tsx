"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { 
  Users, 
  Mail, 
  Gift,
  Filter,
  Search,
  Loader2,
  Calendar,
  CreditCard,
  Activity,
  Send,
  X,
  ChevronDown,
  Download,
  TrendingUp,
  History,
  Eye,
  Undo2,
  Save,
  FileText,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface FilterState {
  lastActive?: {
    operator: 'between' | 'gt' | 'lt';
    value: Date;
    endValue?: Date;
  };
  projectCount?: {
    operator: 'equals' | 'gt' | 'lt' | 'between';
    value: number;
    endValue?: number;
  };
  creditBalance?: {
    operator: 'equals' | 'gt' | 'lt' | 'between';
    value: number;
    endValue?: number;
  };
  registrationDate?: {
    operator: 'between' | 'gt' | 'lt';
    value: Date;
    endValue?: Date;
  };
  emailDomain?: string;
  search?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  category: 'promotional' | 'transactional' | 'newsletter' | 'custom';
  lastUsed?: Date;
  useCount: number;
}

interface BulkActionHistory {
  id: string;
  type: 'give_credits' | 'send_email';
  affectedUsers: number;
  timestamp: Date;
  details: any;
  canUndo: boolean;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome-back',
    name: 'Welcome Back Campaign',
    subject: 'We missed you, {{firstName}}!',
    content: `Hi {{firstName}},

We noticed you haven't created a video in a while. As a welcome back gift, we're giving you {{creditAmount}} free credits!

Your current balance: {{creditBalance}} credits

Ready to create something amazing? Click below to start:
{{ctaButton}}

Best regards,
The Bazaar Team`,
    variables: ['firstName', 'creditAmount', 'creditBalance', 'ctaButton'],
    category: 'promotional',
    useCount: 0,
  },
  {
    id: 'credit-bonus',
    name: 'Credit Bonus Notification',
    subject: '🎁 You just received {{creditAmount}} bonus credits!',
    content: `Hi {{firstName}},

Great news! You've just received {{creditAmount}} bonus credits.

Reason: {{reason}}
New balance: {{creditBalance}} credits

Start creating your next video now!

The Bazaar Team`,
    variables: ['firstName', 'creditAmount', 'creditBalance', 'reason'],
    category: 'transactional',
    useCount: 0,
  },
  {
    id: 'feature-announcement',
    name: 'New Feature Announcement',
    subject: '🚀 Exciting new features in Bazaar!',
    content: `Hi {{firstName}},

We've been working hard to make Bazaar even better for you!

Here's what's new:
{{featureList}}

As a thank you for being an active user, enjoy {{creditAmount}} bonus credits on us!

Try the new features: {{ctaButton}}

Happy creating!
The Bazaar Team`,
    variables: ['firstName', 'featureList', 'creditAmount', 'ctaButton'],
    category: 'newsletter',
    useCount: 0,
  },
];

export default function EnhancedMarketingPage() {
  // State
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  // Filter states
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'basic' | 'advanced'>('basic');
  
  // Template states
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  
  // Bulk action states
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'give_credits' | 'send_email' | null>(null);
  const [creditAmount, setCreditAmount] = useState(30);
  const [creditReason, setCreditReason] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [actionHistory, setActionHistory] = useState<BulkActionHistory[]>([]);
  
  // Transaction history states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

  // Quick filter presets
  const [activePreset, setActivePreset] = useState<string>('all');

  // API queries
  const { data: stats, isLoading: statsLoading } = api.adminMarketing.getMarketingStats.useQuery();
  
  const { data: usersData, isLoading: usersLoading, refetch } = api.adminMarketing.getFilteredUsers.useQuery({
    ...filters,
    limit: 100,
    offset: 0,
    sortBy: 'lastActive',
    sortOrder: 'desc',
  });

  // Get credit history for selected user
  const { data: creditHistory } = api.adminMarketing.getUserCreditHistory.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId && showTransactionHistory }
  );

  // Mutations
  const executeBulkAction = api.adminMarketing.executeBulkAction.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      
      // Add to history
      const historyItem: BulkActionHistory = {
        id: Date.now().toString(),
        type: bulkActionType!,
        affectedUsers: result.results.successful,
        timestamp: new Date(),
        details: {
          creditAmount: bulkActionType === 'give_credits' ? creditAmount : undefined,
          emailSubject: bulkActionType === 'send_email' ? emailSubject : undefined,
        },
        canUndo: bulkActionType === 'give_credits',
      };
      setActionHistory(prev => [historyItem, ...prev]);
      
      // Reset states
      setSelectedUsers(new Set());
      setSelectAll(false);
      setShowBulkActionDialog(false);
      setBulkActionType(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const undoBulkAction = api.adminMarketing.undoBulkAction.useMutation({
    onSuccess: () => {
      toast.success('Action undone successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to undo: ${error.message}`);
    },
  });

  // Progressive filter helpers
  const addFilter = (filterType: string, config: any) => {
    setFilters(prev => ({ ...prev, [filterType]: config }));
    setActiveFilters(prev => [...new Set([...prev, filterType])]);
  };

  const removeFilter = (filterType: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterType as keyof FilterState];
      return newFilters;
    });
    setActiveFilters(prev => prev.filter(f => f !== filterType));
  };

  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    setActiveFilters([]);
    const now = new Date();
    
    switch (preset) {
      case 'active_week':
        setFilters({
          lastActive: {
            operator: 'gt',
            value: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        });
        setActiveFilters(['lastActive']);
        break;
      case 'active_month':
        setFilters({
          lastActive: {
            operator: 'gt',
            value: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        });
        setActiveFilters(['lastActive']);
        break;
      case 'high_usage':
        setFilters({
          projectCount: {
            operator: 'gt',
            value: 10,
          },
        });
        setActiveFilters(['projectCount']);
        break;
      case 'low_credits':
        setFilters({
          creditBalance: {
            operator: 'lt',
            value: 10,
          },
        });
        setActiveFilters(['creditBalance']);
        break;
      case 'new_users':
        setFilters({
          registrationDate: {
            operator: 'gt',
            value: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        });
        setActiveFilters(['registrationDate']);
        break;
      default:
        setFilters({});
        setActiveFilters([]);
    }
  };

  // Template management
  const saveTemplate = (template: EmailTemplate) => {
    const newTemplates = [...templates.filter(t => t.id !== template.id), template];
    setTemplates(newTemplates);
    localStorage.setItem('email-templates', JSON.stringify(newTemplates));
    toast.success('Template saved');
    setShowTemplateDialog(false);
    setEditingTemplate(null);
  };

  const loadTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEmailSubject(template.subject);
    setEmailContent(template.content);
    
    // Update use count
    const updatedTemplate = { ...template, lastUsed: new Date(), useCount: template.useCount + 1 };
    saveTemplate(updatedTemplate);
  };

  // Handle bulk actions with confirmation
  const handleBulkAction = () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (bulkActionType === 'give_credits') {
      if (creditAmount <= 0) {
        toast.error('Credit amount must be positive');
        return;
      }

      executeBulkAction.mutate({
        type: 'give_credits',
        userIds: Array.from(selectedUsers),
        amount: creditAmount,
        description: creditReason || `Admin bonus: ${creditAmount} credits`,
      });
    } else if (bulkActionType === 'send_email') {
      if (!emailSubject.trim() || !emailContent.trim()) {
        toast.error('Email subject and content are required');
        return;
      }

      executeBulkAction.mutate({
        type: 'send_email',
        userIds: Array.from(selectedUsers),
        subject: emailSubject,
        template: emailContent,
        variables: {
          creditAmount: creditAmount.toString(),
        },
      });
    }
  };

  // Handle undo
  const handleUndo = (historyItem: BulkActionHistory) => {
    if (!historyItem.canUndo) {
      toast.error('This action cannot be undone');
      return;
    }

    undoBulkAction.mutate({
      actionId: historyItem.id,
      type: historyItem.type,
    });
  };

  // Load templates from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('email-templates');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTemplates([...DEFAULT_TEMPLATES, ...parsed]);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    }
  }, []);

  if (statsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Dashboard</h1>
          <p className="text-muted-foreground">
            Advanced user management with progressive filtering
          </p>
        </div>
        <div className="flex gap-2">
          {actionHistory.length > 0 && (
            <Button onClick={() => setActiveTab('history')} variant="outline">
              <History className="h-4 w-4 mr-2" />
              History ({actionHistory.length})
            </Button>
          )}
          <Button onClick={() => setShowTemplateDialog(true)} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeToday || 0}</div>
            <p className="text-xs text-muted-foreground">Created projects today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeThisWeek || 0}</div>
            <p className="text-xs text-muted-foreground">7-day active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">30-day active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Given</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCreditsGiven || 0}</div>
            <p className="text-xs text-muted-foreground">Via bulk actions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="history">Action History</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Progressive Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Progressive Filters
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary">{activeFilters.length} active</Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filterMode === 'basic' ? 'default' : 'outline'}
                    onClick={() => setFilterMode('basic')}
                  >
                    Basic
                  </Button>
                  <Button
                    size="sm"
                    variant={filterMode === 'advanced' ? 'default' : 'outline'}
                    onClick={() => setFilterMode('advanced')}
                  >
                    Advanced
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filterMode === 'basic' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant={activePreset === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset('all')}
                    >
                      All Users
                    </Button>
                    <Button 
                      variant={activePreset === 'active_week' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset('active_week')}
                    >
                      Active This Week
                    </Button>
                    <Button 
                      variant={activePreset === 'active_month' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset('active_month')}
                    >
                      Active This Month
                    </Button>
                    <Button 
                      variant={activePreset === 'high_usage' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset('high_usage')}
                    >
                      High Usage (10+ projects)
                    </Button>
                    <Button 
                      variant={activePreset === 'low_credits' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset('low_credits')}
                    >
                      Low Credits (&lt;10)
                    </Button>
                    <Button 
                      variant={activePreset === 'new_users' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPreset('new_users')}
                    >
                      New Users (7 days)
                    </Button>
                  </div>
                  
                  {/* Active filters display */}
                  {activeFilters.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Active filters:</span>
                      {activeFilters.map(filter => (
                        <Badge key={filter} variant="secondary">
                          {filter}
                          <button
                            onClick={() => removeFilter(filter)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Email Domain</Label>
                    <Input
                      placeholder="gmail.com"
                      value={filters.emailDomain || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          addFilter('emailDomain', e.target.value);
                        } else {
                          removeFilter('emailDomain');
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label>Search Name/Email</Label>
                    <Input
                      placeholder="Search users..."
                      value={filters.search || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          addFilter('search', e.target.value);
                        } else {
                          removeFilter('search');
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => refetch()}>
                      <Search className="h-4 w-4 mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Users ({usersData?.totalCount || 0})
                  {selectedUsers.size > 0 && (
                    <Badge className="ml-2" variant="secondary">
                      {selectedUsers.size} selected
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  {selectedUsers.size > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBulkActionType('give_credits');
                          setShowBulkActionDialog(true);
                        }}
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Give Credits
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBulkActionType('send_email');
                          setShowBulkActionDialog(true);
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={(checked) => {
                            setSelectAll(checked as boolean);
                            if (checked && usersData?.users) {
                              setSelectedUsers(new Set(usersData.users.map(u => u.id)));
                            } else {
                              setSelectedUsers(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-center">Projects</th>
                      <th className="p-2 text-center">Credits</th>
                      <th className="p-2 text-left">Registered</th>
                      <th className="p-2 text-left">Last Active</th>
                      <th className="p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData?.users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/25">
                        <td className="p-2">
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedUsers);
                              if (checked) {
                                newSelected.add(user.id);
                              } else {
                                newSelected.delete(user.id);
                              }
                              setSelectedUsers(newSelected);
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {user.image && (
                              <img 
                                src={user.image} 
                                alt={user.name || ''} 
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <span className="font-medium">{user.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">{user.email}</td>
                        <td className="p-2 text-center">
                          <Badge variant="outline">{user.projectCount}</Badge>
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant={user.currentCredits < 10 ? 'destructive' : 'default'}>
                            {user.currentCredits}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm">
                          {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="p-2 text-sm">
                          {user.lastProjectDate 
                            ? format(new Date(user.lastProjectDate), 'MMM dd, yyyy')
                            : <span className="text-muted-foreground">Never</span>
                          }
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowTransactionHistory(true);
                            }}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Action History</CardTitle>
              <CardDescription>
                Recent bulk actions with undo capability
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No actions performed yet
                </p>
              ) : (
                <div className="space-y-4">
                  {actionHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {item.type === 'give_credits' ? (
                          <Gift className="h-5 w-5 text-green-500" />
                        ) : (
                          <Mail className="h-5 w-5 text-blue-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {item.type === 'give_credits' 
                              ? `Gave ${item.details.creditAmount} credits to ${item.affectedUsers} users`
                              : `Sent email to ${item.affectedUsers} users`
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {item.canUndo && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUndo(item)}
                        >
                          <Undo2 className="h-4 w-4 mr-2" />
                          Undo
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === 'give_credits' ? 'Give Credits' : 'Send Email'}
            </DialogTitle>
            <DialogDescription>
              This action will affect {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          {bulkActionType === 'give_credits' ? (
            <div className="space-y-4">
              <div>
                <Label>Credit Amount</Label>
                <Input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  placeholder="Holiday bonus, Welcome back gift, etc."
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>Total credits to be distributed: {creditAmount * selectedUsers.size}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedTemplate && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Using template: {selectedTemplate.name}</p>
                </div>
              )}
              <div>
                <Label>Subject</Label>
                <Input
                  placeholder="Special offer for our valued users"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div>
                <Label>Email Content</Label>
                <Textarea
                  rows={10}
                  placeholder="Hi {{firstName}},

Your email content here..."
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Variables: {'{{firstName}}, {{email}}, {{creditBalance}}'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTemplateDialog(true)}
                  >
                    Load Template
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAction} disabled={executeBulkAction.isPending}>
              {executeBulkAction.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm & Execute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Library Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Template Library</DialogTitle>
            <DialogDescription>
              Choose from saved templates or create your own
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="browse">
            <TabsList>
              <TabsTrigger value="browse">Browse Templates</TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="space-y-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{template.category}</Badge>
                          {template.lastUsed && (
                            <span className="text-xs text-muted-foreground">
                              Last used {formatDistanceToNow(template.lastUsed, { addSuffix: true })}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Used {template.useCount} times
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadTemplate(template)}
                        >
                          Use Template
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTemplate(template)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Subject: {template.subject}</p>
                      <pre className="text-sm text-muted-foreground bg-muted p-3 rounded-lg whitespace-pre-wrap">
                        {template.content.substring(0, 200)}...
                      </pre>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map(v => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input placeholder="My Custom Template" />
              </div>
              <div>
                <Label>Category</Label>
                <select className="w-full p-2 border rounded-lg">
                  <option value="promotional">Promotional</option>
                  <option value="transactional">Transactional</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input placeholder="Email subject with {{variables}}" />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea rows={10} placeholder="Email content..." />
              </div>
              <Button className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Credit Transaction History Dialog */}
      <Dialog open={showTransactionHistory} onOpenChange={setShowTransactionHistory}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Credit Transaction History</DialogTitle>
            <DialogDescription>
              Complete credit history for selected user
            </DialogDescription>
          </DialogHeader>

          {creditHistory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Current Balance</p>
                  <p className="text-2xl font-bold">{creditHistory.currentBalance} credits</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-lg font-medium text-green-600">
                    +{creditHistory.totalEarned}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Used</p>
                  <p className="text-lg font-medium text-red-600">
                    -{creditHistory.totalUsed}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {creditHistory.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {tx.amount > 0 ? (
                        <div className="p-2 bg-green-100 rounded-full">
                          <Plus className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-red-100 rounded-full">
                          <DollarSign className="h-4 w-4 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Balance: {tx.balance}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}