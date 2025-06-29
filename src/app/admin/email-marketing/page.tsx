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
  const [selectedSegment, setSelectedSegment] = useState<'users' | 'subscribers' | 'all' | 'none'>('none');
  const [recipientSearch, setRecipientSearch] = useState('');

  // UI state
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  // Queries
  const { data: emailStats, isLoading: statsLoading } = api.admin.getEmailStats.useQuery();
  const { data: recipients, refetch: refetchRecipients } = api.admin.getEmailRecipients.useQuery({
    segment: selectedSegment === 'none' ? 'all' : selectedSegment,
    search: recipientSearch,
    limit: 100,
  }, {
    enabled: selectedSegment !== 'none', // Only fetch when a segment is selected
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
      toast.error('Please enter email content');
      return;
    }

    try {
      let emailRecipients: string[] = [];
      
      if (selectedSegment === 'none') {
        // Only use custom emails when "none" is selected
        if (customEmail.trim()) {
          emailRecipients = customEmail.split(',').map(email => email.trim()).filter(Boolean);
        } else {
          toast.error('Please enter custom email addresses');
          return;
        }
      } else if (sendToAll) {
        emailRecipients = recipients?.recipients.map(r => r.email) || [];
      } else if (customEmail.trim()) {
        emailRecipients = customEmail.split(',').map(email => email.trim()).filter(Boolean);
      } else if (selectedUserIds.length > 0) {
        const selectedRecipients = recipients?.recipients.filter(r => selectedUserIds.includes(r.id)) || [];
        emailRecipients = selectedRecipients.map(r => r.email);
      }

      if (emailRecipients.length === 0) {
        toast.error('Please select recipients or enter custom email addresses');
        return;
      }

      // Send emails in batches to avoid overwhelming the API
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < emailRecipients.length; i += batchSize) {
        batches.push(emailRecipients.slice(i, i + batchSize));
      }

      let totalSent = 0;
      let totalFailed = 0;

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(email => 
            sendEmailMutation.mutateAsync({
              customEmails: [email],
              sendToAll: false,
              subject: 'Custom Email Campaign',
              content: emailCode,
              isCustomCode: true,
            })
          )
        );

        results.forEach(result => {
          if (result.status === 'fulfilled') {
            totalSent += result.value.totalSent;
            totalFailed += result.value.totalFailed;
          } else {
            totalFailed += 1;
          }
        });
      }

      toast.success(`Email sent successfully! ${totalSent} sent, ${totalFailed} failed`);
      
      // Reset form
      setEmailCode('');
      setCustomEmail('');
      setSelectedUserIds([]);
      setSendToAll(false);
      
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const filteredUsers = recipients?.recipients.filter(user => 
    user.name?.toLowerCase().includes(recipientSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(recipientSearch.toLowerCase())
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
            <CardTitle className="text-sm font-medium">Newsletter Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.totalSubscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total subscribers
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
            
            {/* Segment Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Segment
              </label>
              <select
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value as 'users' | 'subscribers' | 'all' | 'none')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Recipients ({recipients?.segments.users || 0} users + {recipients?.segments.subscribers || 0} subscribers)</option>
                <option value="users">Registered Users ({recipients?.segments.users || 0})</option>
                <option value="subscribers">Newsletter Subscribers ({recipients?.segments.subscribers || 0})</option>
                <option value="none">None</option>
              </select>
            </div>

            {/* Send to All Toggle */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendToAll}
                  onChange={(e) => {
                    setSendToAll(e.target.checked);
                    if (e.target.checked) {
                      setCustomEmail('');
                      setSelectedUserIds([]);
                    }
                  }}
                  className="mr-2"
                  disabled={selectedSegment === 'none'} // Disable when "none" is selected
                />
                <span className="text-sm font-medium text-gray-700">
                  {selectedSegment === 'none' ? (
                    <span className="text-gray-400">Send to all (disabled - no segment selected)</span>
                  ) : (
                    <>
                      Send to all {selectedSegment === 'all' ? 'recipients' : selectedSegment} 
                      ({selectedSegment === 'all' ? (recipients?.totalCount || 0) : 
                        selectedSegment === 'users' ? (recipients?.segments.users || 0) : 
                        (recipients?.segments.subscribers || 0)} emails)
                    </>
                  )}
                </span>
              </label>
            </div>

            {(!sendToAll || selectedSegment === 'none') && (
              <>
                {/* Custom Email Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Email Addresses (comma-separated)
                  </label>
                  <textarea
                    value={customEmail}
                    onChange={(e) => {
                      setCustomEmail(e.target.value);
                      if (e.target.value.trim()) {
                        setSelectedUserIds([]);
                      }
                    }}
                    placeholder="email1@example.com, email2@example.com"
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* User Search and Selection - Only show when segment is selected and no custom emails */}
                {selectedSegment !== 'none' && !customEmail.trim() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search and Select Recipients
                    </label>
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full p-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg">
                      {recipients?.recipients.map((recipient) => (
                        <label key={recipient.id} className="flex items-center p-3 hover:bg-gray-50 border-b last:border-b-0">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(recipient.id)}
                            onChange={(e) => handleUserSelection(recipient.id, e.target.checked)}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{recipient.name || recipient.email}</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                recipient.type === 'user' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {recipient.type === 'user' ? 'User' : 'Subscriber'}
                              </span>
                            </div>
                            {recipient.name && (
                              <div className="text-sm text-gray-500">{recipient.email}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    
                    {selectedUserIds.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        {selectedUserIds.length} recipient{selectedUserIds.length !== 1 ? 's' : ''} selected
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSendEmail}
            className="w-full" 
            disabled={sendEmailMutation.isPending || !emailCode.trim()}
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