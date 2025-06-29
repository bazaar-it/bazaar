"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye,
  MousePointer,
  Calendar
} from "lucide-react";

export default function EmailMarketingPage() {
  // Newsletter form state
  const [newsletterForm, setNewsletterForm] = useState({
    subject: '',
    content: '',
    ctaText: '',
    ctaUrl: '',
    sendToAll: false,
    selectedUsers: [] as string[],
  });

  const [welcomeEmailUserId, setWelcomeEmailUserId] = useState('');

  // Queries
  const { data: emailStats, isLoading: statsLoading } = api.admin.getEmailStats.useQuery();
  const { data: users, isLoading: usersLoading } = api.admin.getUsers.useQuery({
    page: 1,
    limit: 100,
  });

  // Mutations
  const sendNewsletterMutation = api.admin.sendNewsletter.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setNewsletterForm({
        subject: '',
        content: '',
        ctaText: '',
        ctaUrl: '',
        sendToAll: false,
        selectedUsers: [],
      });
    },
    onError: (error) => {
      toast.error(`Failed to send newsletter: ${error.message}`);
    },
  });

  const sendWelcomeEmailMutation = api.admin.sendWelcomeEmail.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setWelcomeEmailUserId('');
    },
    onError: (error) => {
      toast.error(`Failed to send welcome email: ${error.message}`);
    },
  });

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newsletterForm.subject.trim() || !newsletterForm.content.trim()) {
      toast.error('Subject and content are required');
      return;
    }

    if (!newsletterForm.sendToAll && newsletterForm.selectedUsers.length === 0) {
      toast.error('Please select users or enable "Send to All"');
      return;
    }

    sendNewsletterMutation.mutate({
      subject: newsletterForm.subject,
      content: newsletterForm.content,
      ctaText: newsletterForm.ctaText || undefined,
      ctaUrl: newsletterForm.ctaUrl || undefined,
      sendToAll: newsletterForm.sendToAll,
      userIds: newsletterForm.sendToAll ? undefined : newsletterForm.selectedUsers,
    });
  };

  const handleSendWelcomeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!welcomeEmailUserId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    sendWelcomeEmailMutation.mutate({
      userId: welcomeEmailUserId,
    });
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setNewsletterForm(prev => ({
        ...prev,
        selectedUsers: [...prev.selectedUsers, userId]
      }));
    } else {
      setNewsletterForm(prev => ({
        ...prev,
        selectedUsers: prev.selectedUsers.filter(id => id !== userId)
      }));
    }
  };

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
            Send newsletters and welcome emails to your users
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

      {/* Email Campaigns */}
      <Tabs defaultValue="newsletter" className="space-y-4">
        <TabsList>
          <TabsTrigger value="newsletter">Newsletter Campaign</TabsTrigger>
          <TabsTrigger value="welcome">Welcome Email</TabsTrigger>
        </TabsList>

        {/* Newsletter Tab */}
        <TabsContent value="newsletter">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Newsletter
              </CardTitle>
              <CardDescription>
                Create and send a newsletter to your users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNewsletterSubmit} className="space-y-6">
                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line *</Label>
                  <Input
                    id="subject"
                    placeholder="Your amazing newsletter subject..."
                    value={newsletterForm.subject}
                    onChange={(e) => setNewsletterForm(prev => ({ ...prev, subject: e.target.value }))}
                    required
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Email Content *</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your newsletter content here..."
                    rows={8}
                    value={newsletterForm.content}
                    onChange={(e) => setNewsletterForm(prev => ({ ...prev, content: e.target.value }))}
                    required
                  />
                </div>

                {/* Call to Action */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ctaText">Call to Action Text</Label>
                    <Input
                      id="ctaText"
                      placeholder="Get Started"
                      value={newsletterForm.ctaText}
                      onChange={(e) => setNewsletterForm(prev => ({ ...prev, ctaText: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ctaUrl">Call to Action URL</Label>
                    <Input
                      id="ctaUrl"
                      type="url"
                      placeholder="https://bazaar-vid.com"
                      value={newsletterForm.ctaUrl}
                      onChange={(e) => setNewsletterForm(prev => ({ ...prev, ctaUrl: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator />

                {/* Recipients */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sendToAll"
                      checked={newsletterForm.sendToAll}
                      onCheckedChange={(checked) => 
                        setNewsletterForm(prev => ({ 
                          ...prev, 
                          sendToAll: checked,
                          selectedUsers: checked ? [] : prev.selectedUsers
                        }))
                      }
                    />
                    <Label htmlFor="sendToAll">Send to all users</Label>
                    {newsletterForm.sendToAll && (
                      <Badge variant="secondary">
                        {emailStats?.totalUsers || 0} recipients
                      </Badge>
                    )}
                  </div>

                  {!newsletterForm.sendToAll && (
                    <div className="space-y-2">
                      <Label>Select Recipients</Label>
                      <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                        {usersLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {users?.users.map((user) => (
                              <div key={user.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`user-${user.id}`}
                                  checked={newsletterForm.selectedUsers.includes(user.id)}
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
                      {newsletterForm.selectedUsers.length > 0 && (
                        <Badge variant="secondary">
                          {newsletterForm.selectedUsers.length} recipients selected
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={sendNewsletterMutation.isPending}
                >
                  {sendNewsletterMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Newsletter
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Welcome Email Tab */}
        <TabsContent value="welcome">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Send Welcome Email
              </CardTitle>
              <CardDescription>
                Send a welcome email to a specific user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendWelcomeEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">User ID *</Label>
                  <Input
                    id="userId"
                    placeholder="Enter user ID..."
                    value={welcomeEmailUserId}
                    onChange={(e) => setWelcomeEmailUserId(e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    You can find user IDs in the Users management section
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={sendWelcomeEmailMutation.isPending}
                >
                  {sendWelcomeEmailMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Welcome Email
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Templates Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>
            Preview of the email templates used by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Welcome Email
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sent to new users when they sign up
              </p>
              <ul className="text-sm space-y-1">
                <li>• Personalized greeting</li>
                <li>• Platform introduction</li>
                <li>• Feature highlights</li>
                <li>• Call-to-action button</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                Newsletter Template
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customizable newsletter for marketing campaigns
              </p>
              <ul className="text-sm space-y-1">
                <li>• Custom subject and content</li>
                <li>• Feature highlights section</li>
                <li>• Social media links</li>
                <li>• Unsubscribe options</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 