"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
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
  FolderOpen,
  Download,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

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

export default function MarketingPage() {
  // State
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'give_credits' | 'send_email' | null>(null);
  
  // Bulk action states
  const [creditAmount, setCreditAmount] = useState(30);
  const [creditDescription, setCreditDescription] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);

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

  // Mutations
  const executeBulkAction = api.adminMarketing.executeBulkAction.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setSelectedUsers(new Set());
      setSelectAll(false);
      setShowBulkActionModal(false);
      setBulkActionType(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  // Apply filter presets
  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'active_week':
        setFilters({
          lastActive: {
            operator: 'gt',
            value: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        });
        break;
      case 'active_month':
        setFilters({
          lastActive: {
            operator: 'gt',
            value: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        });
        break;
      case 'high_usage':
        setFilters({
          projectCount: {
            operator: 'gt',
            value: 10,
          },
        });
        break;
      case 'low_credits':
        setFilters({
          creditBalance: {
            operator: 'lt',
            value: 10,
          },
        });
        break;
      case 'new_users':
        setFilters({
          registrationDate: {
            operator: 'gt',
            value: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        });
        break;
      default:
        setFilters({});
    }
  };

  // Handle select all
  useEffect(() => {
    if (selectAll && usersData?.users) {
      setSelectedUsers(new Set(usersData.users.map(u => u.id)));
    } else if (!selectAll) {
      setSelectedUsers(new Set());
    }
  }, [selectAll, usersData]);

  // Handle bulk actions
  const handleBulkAction = () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (!bulkActionType) {
      toast.error('Please select an action');
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
        description: creditDescription || undefined,
      });
    } else if (bulkActionType === 'send_email') {
      if (!emailSubject.trim() || !emailTemplate.trim()) {
        toast.error('Email subject and template are required');
        return;
      }

      executeBulkAction.mutate({
        type: 'send_email',
        userIds: Array.from(selectedUsers),
        subject: emailSubject,
        template: emailTemplate,
      });
    }
  };

  // Export users as CSV
  const exportUsers = () => {
    if (!usersData?.users) return;
    
    const csv = [
      ['ID', 'Name', 'Email', 'Projects', 'Credits', 'Registered', 'Last Active'],
      ...usersData.users.map(u => [
        u.id,
        u.name || '',
        u.email,
        u.projectCount.toString(),
        u.currentCredits.toString(),
        format(new Date(u.createdAt), 'yyyy-MM-dd'),
        u.lastProjectDate ? format(new Date(u.lastProjectDate), 'yyyy-MM-dd') : 'Never',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            Filter users, execute bulk actions, and manage campaigns
          </p>
        </div>
        <Button onClick={exportUsers} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
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

      {/* Filter Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Quick Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
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

          {/* Advanced Filters Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() => setShowFilters(!showFilters)}
          >
            <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            Advanced Filters
          </Button>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 grid gap-4 md:grid-cols-3 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label>Email Domain</Label>
                <Input
                  placeholder="gmail.com"
                  value={filters.emailDomain || ''}
                  onChange={(e) => setFilters({ ...filters, emailDomain: e.target.value })}
                />
              </div>
              <div>
                <Label>Search Name/Email</Label>
                <Input
                  placeholder="Search users..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
                      setShowBulkActionModal(true);
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
                      setShowBulkActionModal(true);
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
                      onCheckedChange={(checked) => setSelectAll(checked as boolean)}
                    />
                  </th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-center">Projects</th>
                  <th className="p-2 text-center">Credits</th>
                  <th className="p-2 text-left">Registered</th>
                  <th className="p-2 text-left">Last Active</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Modal */}
      {showBulkActionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {bulkActionType === 'give_credits' ? 'Give Credits' : 'Send Email'}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowBulkActionModal(false);
                    setBulkActionType(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                This action will affect {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bulkActionType === 'give_credits' ? (
                <>
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
                    <Label>Description (optional)</Label>
                    <Input
                      placeholder="Holiday bonus credits"
                      value={creditDescription}
                      onChange={(e) => setCreditDescription(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      placeholder="Special offer for our valued users"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Email Template</Label>
                    <Textarea
                      rows={8}
                      placeholder="Hi {{firstName}},

We're giving you 30 free credits as a thank you for being an active user!

Your new balance: {{creditBalance}} credits

Best,
The Bazaar Team"
                      value={emailTemplate}
                      onChange={(e) => setEmailTemplate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Available variables: {'{{firstName}}, {{email}}, {{name}}'}
                    </p>
                  </div>
                </>
              )}
              
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleBulkAction}
                  disabled={executeBulkAction.isPending}
                >
                  {executeBulkAction.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Execute
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkActionModal(false);
                    setBulkActionType(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}