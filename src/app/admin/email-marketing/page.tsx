"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { 
  Mail, 
  Send, 
  Users, 
  TrendingUp, 
  Clock, 
  Loader2,
  Eye,
  Code,
  Save,
  Plus,
  Search,
  X
} from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
}

export default function EmailMarketingPage() {
  // Email composition state
  const [emailCode, setEmailCode] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<EmailTemplate[]>([]);
  
  // Recipient selection state
  const [sendToAll, setSendToAll] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // UI state
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  // Queries
  const { data: emailStats, isLoading: statsLoading } = api.admin.getEmailStats.useQuery();
  const { data: users, isLoading: usersLoading } = api.admin.getUsers.useQuery({
    page: 1,
    limit: 100,
    search: userSearch,
  });

  // Mutations
  const sendEmailMutation = api.admin.sendNewsletter.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      // Reset form
      setEmailCode('');
      setCustomEmail('');
      setSelectedUserIds([]);
      setSendToAll(false);
    },
    onError: (error) => {
      toast.error(`Failed to send email: ${error.message}`);
    },
  });

  // Load templates from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('email-templates');
    if (stored) {
      try {
        setSavedTemplates(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    }
  }, []);

  // Save templates to localStorage
  const saveTemplate = () => {
    if (!templateName.trim() || !emailCode.trim()) {
      toast.error('Template name and code are required');
      return;
    }

    const newTemplate: EmailTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      code: emailCode,
      createdAt: new Date(),
    };

    const updatedTemplates = [...savedTemplates, newTemplate];
    setSavedTemplates(updatedTemplates);
    localStorage.setItem('email-templates', JSON.stringify(updatedTemplates));
    
    toast.success('Template saved successfully');
    setTemplateName('');
    setShowTemplateForm(false);
  };

  const loadTemplate = (template: EmailTemplate) => {
    setEmailCode(template.code);
    toast.success(`Loaded template: ${template.name}`);
  };

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updatedTemplates);
    localStorage.setItem('email-templates', JSON.stringify(updatedTemplates));
    toast.success('Template deleted');
  };

  const handleSendEmail = async () => {
    if (!emailCode.trim()) {
      toast.error('Email code is required');
      return;
    }

    // Determine recipients
    let recipients: string[] = [];
    
    if (sendToAll) {
      recipients = users?.users.map(u => u.email) || [];
    } else if (customEmail.trim()) {
      recipients = [customEmail.trim()];
    } else if (selectedUserIds.length > 0) {
      const selectedUsers = users?.users.filter(u => selectedUserIds.includes(u.id)) || [];
      recipients = selectedUsers.map(u => u.email);
    }

    if (recipients.length === 0) {
      toast.error('Please select recipients');
      return;
    }

         // Send as custom React code email
     sendEmailMutation.mutate({
       sendToAll,
       userIds: sendToAll ? undefined : selectedUserIds,
       subject: 'Custom Email Campaign',
       content: emailCode,
       isCustomCode: true,
     });
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const filteredUsers = users?.users.filter(user => 
    user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  ) || [];

  if (statsLoading) {
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
          <h1 className="text-3xl font-bold">Email Marketing</h1>
          <p className="text-muted-foreground">
            Create and send custom email campaigns with React code
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Powered by Resend
        </Badge>
      </div>

      {/* Email Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available recipients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.recentUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Recent signups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.emailsSentToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              Sent today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.openRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Email engagement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Email Campaign Builder
          </CardTitle>
          <CardDescription>
            Build custom emails using React code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Code Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailCode">React Email Code *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateForm(!showTemplateForm)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Save Template
                </Button>
              </div>
            </div>
            
            {showTemplateForm && (
              <div className="flex gap-2 p-3 bg-muted rounded-lg">
                <Input
                  placeholder="Template name..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={saveTemplate} size="sm">
                  <Save className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => setShowTemplateForm(false)} 
                  size="sm" 
                  variant="outline"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Textarea
              id="emailCode"
              placeholder={`// Example React email component
import * as React from 'react';

export function EmailTemplate({ firstName }: { firstName: string }) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>Hello {firstName}!</h1>
      <p>This is a custom email built with React.</p>
      <a href="https://bazaar-vid.com" style={{ 
        backgroundColor: '#3B82F6', 
        color: 'white', 
        padding: '10px 20px', 
        textDecoration: 'none',
        borderRadius: '5px' 
      }}>
        Visit Bazaar-Vid
      </a>
    </div>
  );
}`}
              rows={15}
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
              className="font-mono text-sm"
              required
            />
          </div>

          {/* Saved Templates */}
          {savedTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>Saved Templates</Label>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {savedTemplates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <Button
                        onClick={() => deleteTemplate(template.id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                    <Button
                      onClick={() => loadTemplate(template)}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      Load Template
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Recipient Selection */}
          <div className="space-y-4">
            <Label>Recipients</Label>
            
            {/* Send to All Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="sendToAll"
                checked={sendToAll}
                onCheckedChange={(checked) => {
                  setSendToAll(checked);
                  if (checked) {
                    setCustomEmail('');
                    setSelectedUserIds([]);
                  }
                }}
              />
              <Label htmlFor="sendToAll">Send to all users</Label>
              {sendToAll && (
                <Badge variant="secondary">
                  {emailStats?.totalUsers || 0} recipients
                </Badge>
              )}
            </div>

            {!sendToAll && (
              <div className="space-y-4">
                {/* Custom Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="customEmail">Custom Email Address</Label>
                  <Input
                    id="customEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={customEmail}
                    onChange={(e) => {
                      setCustomEmail(e.target.value);
                      if (e.target.value) {
                        setSelectedUserIds([]);
                      }
                    }}
                  />
                </div>

                {!customEmail && (
                  <div className="space-y-2">
                    <Label>Select from Users</Label>
                    
                    {/* User Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* User List */}
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                      {usersLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No users found
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredUsers.map((user) => (
                            <div key={user.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`user-${user.id}`}
                                checked={selectedUserIds.includes(user.id)}
                                onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                                className="rounded"
                              />
                              <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <span>{user.name || 'Unnamed User'}</span>
                                  <span className="text-sm text-muted-foreground">{user.email}</span>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {selectedUserIds.length > 0 && (
                      <Badge variant="secondary">
                        {selectedUserIds.length} recipients selected
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSendEmail}
            className="w-full" 
            disabled={sendEmailMutation.isPending}
          >
            {sendEmailMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Email Campaign
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 