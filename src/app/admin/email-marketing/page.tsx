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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { render } from '@react-email/render';
import NewsletterEmailTemplate from '~/components/email/NewsletterEmailTemplate';
import { 
  Mail, 
  Send, 
  Users, 
  TrendingUp, 
  Clock, 
  Loader2,
  Eye,
  EyeOff,
  Code,
  Save,
  Plus,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Sparkles,
  FileText,
  Image,
  Gift,
  UserCheck
} from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  createdAt: Date;
}

// Predefined email templates
const TEMPLATE_LIBRARY = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'Onboarding',
    icon: Sparkles,
    subject: 'Welcome to Bazaar! 🎬',
    content: `
      <h2>Welcome aboard!</h2>
      <p>We're thrilled to have you join the Bazaar community. Get ready to create amazing videos with AI-powered tools.</p>
      <h3>Here's what you can do:</h3>
      <ul>
        <li>✨ Generate stunning motion graphics from text</li>
        <li>🎨 Create custom animations with AI</li>
        <li>🚀 Export videos in multiple formats</li>
      </ul>
      <p>Ready to create your first video? Click below to get started!</p>
    `
  },
  {
    id: 'feature-announcement',
    name: 'New Feature',
    category: 'Updates',
    icon: Gift,
    subject: 'New Feature: [Feature Name] is Here! 🚀',
    content: `
      <h2>Exciting news!</h2>
      <p>We've just launched [Feature Name] - a game-changing addition to Bazaar that will revolutionize how you create videos.</p>
      <h3>What's new:</h3>
      <ul>
        <li>🎯 [Key benefit 1]</li>
        <li>⚡ [Key benefit 2]</li>
        <li>🔥 [Key benefit 3]</li>
      </ul>
      <p>Try it out today and let us know what you think!</p>
    `
  },
  {
    id: 'newsletter',
    name: 'Monthly Newsletter',
    category: 'Newsletter',
    icon: FileText,
    subject: 'Bazaar Monthly: Tips, Updates & More 📰',
    content: `
      <h2>Your Monthly Bazaar Update</h2>
      <h3>📊 This Month's Highlights:</h3>
      <ul>
        <li>New templates added to the library</li>
        <li>Performance improvements for faster rendering</li>
        <li>Community spotlight: Amazing videos from our users</li>
      </ul>
      <h3>💡 Pro Tip:</h3>
      <p>Did you know you can use voice commands to generate scenes? Try it in your next project!</p>
      <h3>🎥 Featured Videos:</h3>
      <p>Check out these incredible creations from our community...</p>
    `
  },
  {
    id: 're-engagement',
    name: 'Re-engagement',
    category: 'Marketing',
    icon: UserCheck,
    subject: 'We miss you! Here\'s what\'s new at Bazaar 💜',
    content: `
      <h2>It's been a while!</h2>
      <p>We noticed you haven't created a video in a few weeks. We've added some exciting features since your last visit:</p>
      <ul>
        <li>🎨 50+ new templates</li>
        <li>🤖 Improved AI generation</li>
        <li>📱 Mobile-optimized exports</li>
      </ul>
      <p>Come back and create something amazing! As a welcome back gift, here's a special offer just for you...</p>
    `
  }
];

export default function EmailMarketingPage() {
  // Email composition state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  const [activeTab, setActiveTab] = useState('compose');
  
  // Template state
  const [savedTemplates, setSavedTemplates] = useState<EmailTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  
  // Recipient selection state
  const [sendToAll, setSendToAll] = useState(false);
  const [customEmails, setCustomEmails] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<'users' | 'subscribers' | 'all' | 'none'>('none');
  const [recipientSearch, setRecipientSearch] = useState('');

  // Queries
  const { data: emailStats, isLoading: statsLoading } = api.admin.getEmailStats.useQuery();
  const { data: recipients, refetch: refetchRecipients } = api.admin.getEmailRecipients.useQuery({
    segment: selectedSegment === 'none' ? 'all' : selectedSegment,
    search: recipientSearch,
    limit: 100,
  }, {
    enabled: selectedSegment !== 'none',
  });

  // Mutations
  const sendEmailMutation = api.admin.sendNewsletter.useMutation({
    onSuccess: (result) => {
      toast.success(`Email campaign sent! ${result.totalSent} sent, ${result.totalFailed} failed`);
      // Reset form
      setEmailSubject('');
      setEmailContent('');
      setCustomEmails('');
      setSelectedUserIds([]);
      setSendToAll(false);
      setSelectedSegment('none');
    },
    onError: (error) => {
      toast.error(`Failed to send email: ${error.message}`);
    },
  });

  // Load saved templates from localStorage
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

  // Save template
  const saveTemplate = () => {
    if (!templateName.trim() || !emailContent.trim() || !emailSubject.trim()) {
      toast.error('Template name, subject, and content are required');
      return;
    }

    const newTemplate: EmailTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      subject: emailSubject.trim(),
      content: emailContent,
      category: 'Custom',
      createdAt: new Date(),
    };

    const updatedTemplates = [...savedTemplates, newTemplate];
    setSavedTemplates(updatedTemplates);
    localStorage.setItem('email-templates', JSON.stringify(updatedTemplates));
    
    toast.success('Template saved successfully');
    setTemplateName('');
    setShowTemplateForm(false);
  };

  const loadTemplate = (template: { subject: string; content: string; name?: string }) => {
    setEmailSubject(template.subject);
    setEmailContent(template.content);
    if (template.name) {
      toast.success(`Loaded template: ${template.name}`);
    }
    setActiveTab('compose');
  };

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updatedTemplates);
    localStorage.setItem('email-templates', JSON.stringify(updatedTemplates));
    toast.success('Template deleted');
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast.error('Please enter email subject and content');
      return;
    }

    let emailRecipients: string[] = [];
    
    if (selectedSegment === 'none' && customEmails.trim()) {
      // Custom emails only
      emailRecipients = customEmails.split(',').map(email => email.trim()).filter(Boolean);
    } else if (sendToAll && recipients) {
      // All recipients in segment
      emailRecipients = recipients.recipients.map(r => r.email);
    } else if (selectedUserIds.length > 0 && recipients) {
      // Selected users only
      const selected = recipients.recipients.filter(r => selectedUserIds.includes(r.id));
      emailRecipients = selected.map(r => r.email);
    } else if (customEmails.trim()) {
      // Custom emails as fallback
      emailRecipients = customEmails.split(',').map(email => email.trim()).filter(Boolean);
    }

    if (emailRecipients.length === 0) {
      toast.error('Please select recipients or enter email addresses');
      return;
    }

    // Confirm before sending
    const confirmed = window.confirm(`Send email to ${emailRecipients.length} recipient(s)?`);
    if (!confirmed) return;

    await sendEmailMutation.mutateAsync({
      customEmails: emailRecipients,
      sendToAll: false,
      subject: emailSubject,
      content: emailContent,
      isCustomCode: false,
    });
  };

  // Generate preview HTML when content or subject changes
  useEffect(() => {
    const generatePreview = async () => {
      if (!emailContent.trim()) {
        setPreviewHTML('');
        return;
      }
      
      try {
        // First check if this is raw HTML content
        let processedContent = emailContent;
        
        // If it's plain text, convert to HTML
        if (!emailContent.includes('<') || !emailContent.includes('>')) {
          processedContent = emailContent
            .split('\n')
            .map(line => line.trim() ? `<p>${line}</p>` : '<br/>')
            .join('');
        }
        
        // Render the email template
        const html = await render(NewsletterEmailTemplate({
          firstName: 'Preview User',
          subject: emailSubject || 'Email Preview',
          content: processedContent,
          ctaText: 'Visit Bazaar',
          ctaUrl: 'https://bazaar.it'
        }));
        
        setPreviewHTML(html);
      } catch (error) {
        console.error('Preview error:', error);
        // Fallback to basic preview
        const fallbackHTML = `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f6f9fc; border-radius: 8px;">
            <div style="background: white; padding: 32px; border-radius: 8px;">
              <h2 style="color: #1f2937; margin-bottom: 16px;">${emailSubject || 'Email Preview'}</h2>
              <div style="color: #374151; line-height: 1.6;">
                ${emailContent}
              </div>
              <div style="margin-top: 24px;">
                <a href="https://bazaar.it" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
                  Visit Bazaar
                </a>
              </div>
            </div>
          </div>
        `;
        setPreviewHTML(fallbackHTML);
      }
    };
    
    generatePreview();
  }, [emailContent, emailSubject]);

  const getRecipientCount = () => {
    if (selectedSegment === 'none' && customEmails.trim()) {
      return customEmails.split(',').filter(e => e.trim()).length;
    }
    if (sendToAll) {
      return recipients?.totalCount || 0;
    }
    if (selectedUserIds.length > 0) {
      return selectedUserIds.length;
    }
    if (customEmails.trim()) {
      return customEmails.split(',').filter(e => e.trim()).length;
    }
    return 0;
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
            Send beautiful email campaigns to your users
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Powered by Resend
        </Badge>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Available recipients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.totalSubscribers || 0}</div>
            <p className="text-xs text-muted-foreground">Newsletter subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.emailsSentToday || 0}</div>
            <p className="text-xs text-muted-foreground">Emails sent today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.openRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Average open rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Email Composer - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaign</CardTitle>
              <CardDescription>
                Compose your email or choose from templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="compose">Compose</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="compose" className="space-y-4">
                  {/* Subject Line */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                      id="subject"
                      placeholder="Enter email subject..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>

                  {/* Email Content */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="content">Email Content (HTML supported)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Hide Preview
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Show Preview
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <Textarea
                      id="content"
                      placeholder="Enter your email content here. HTML tags are supported for formatting."
                      rows={12}
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      className="font-mono text-sm"
                    />

                    {/* Quick formatting tips */}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>💡 Tips: Use HTML for formatting</p>
                      <p>• &lt;h2&gt;Heading&lt;/h2&gt; for titles</p>
                      <p>• &lt;p&gt;Paragraph&lt;/p&gt; for text</p>
                      <p>• &lt;ul&gt;&lt;li&gt;Item&lt;/li&gt;&lt;/ul&gt; for lists</p>
                    </div>
                  </div>

                  {/* Save as Template */}
                  {emailContent.trim() && emailSubject.trim() && (
                    <div className="flex items-center gap-2">
                      {showTemplateForm ? (
                        <>
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
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTemplateForm(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Save as Template
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Email Preview */}
                  {showPreview && emailContent && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-2 border-b">
                        <p className="text-sm font-medium">Email Preview</p>
                      </div>
                      <div className="bg-white p-4 max-h-96 overflow-y-auto">
                        {previewHTML ? (
                          <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            Generating preview...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="templates" className="space-y-4">
                  {/* Template Library */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Template Library</h3>
                    <div className="grid gap-3">
                      {TEMPLATE_LIBRARY.map((template) => {
                        const Icon = template.icon;
                        return (
                          <div key={template.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                  <h4 className="font-medium">{template.name}</h4>
                                  <p className="text-sm text-muted-foreground">{template.category}</p>
                                  <p className="text-sm mt-1">{template.subject}</p>
                                </div>
                              </div>
                              <Button
                                onClick={() => loadTemplate(template)}
                                size="sm"
                                variant="outline"
                              >
                                Use Template
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Saved Templates */}
                  {savedTemplates.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h3 className="font-medium">Your Saved Templates</h3>
                        <div className="grid gap-3">
                          {savedTemplates.map((template) => (
                            <div key={template.id} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium">{template.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(template.createdAt).toLocaleDateString()}
                                  </p>
                                  <p className="text-sm mt-1">{template.subject}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => loadTemplate(template)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Use
                                  </Button>
                                  <Button
                                    onClick={() => deleteTemplate(template.id)}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Recipients - Right Side */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
              <CardDescription>
                Choose who receives this email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Segment Selection */}
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <select
                  value={selectedSegment}
                  onChange={(e) => {
                    setSelectedSegment(e.target.value as any);
                    setSelectedUserIds([]);
                    setSendToAll(false);
                  }}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="none">Custom Recipients</option>
                  <option value="all">All Users & Subscribers</option>
                  <option value="users">Registered Users Only</option>
                  <option value="subscribers">Newsletter Subscribers Only</option>
                </select>
              </div>

              {/* Send to All Toggle */}
              {selectedSegment !== 'none' && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="send-all"
                    checked={sendToAll}
                    onCheckedChange={(checked) => {
                      setSendToAll(checked);
                      if (checked) {
                        setSelectedUserIds([]);
                        setCustomEmails('');
                      }
                    }}
                  />
                  <Label htmlFor="send-all">
                    Send to all {selectedSegment === 'all' ? 'recipients' : selectedSegment}
                    {recipients && ` (${recipients.totalCount})`}
                  </Label>
                </div>
              )}

              {/* Custom Emails */}
              {!sendToAll && (
                <div className="space-y-2">
                  <Label>Custom Email Addresses</Label>
                  <Textarea
                    placeholder="email1@example.com, email2@example.com"
                    rows={3}
                    value={customEmails}
                    onChange={(e) => setCustomEmails(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple emails with commas
                  </p>
                </div>
              )}

              {/* User Selection */}
              {selectedSegment !== 'none' && !sendToAll && (
                <div className="space-y-2">
                  <Label>Or Select Specific Users</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {recipients?.recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        onClick={() => toggleUserSelection(recipient.id)}
                        className={`flex items-center p-2 hover:bg-muted/50 cursor-pointer transition-colors ${
                          selectedUserIds.includes(recipient.id) ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-center flex-1">
                          <div className={`w-4 h-4 border rounded mr-2 flex items-center justify-center ${
                            selectedUserIds.includes(recipient.id) ? 'bg-primary border-primary' : 'border-input'
                          }`}>
                            {selectedUserIds.includes(recipient.id) && (
                              <CheckCircle className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {recipient.name || recipient.email}
                            </p>
                            {recipient.name && (
                              <p className="text-xs text-muted-foreground">{recipient.email}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {recipient.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipient Summary */}
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Recipients</span>
                  <Badge variant="secondary">{getRecipientCount()}</Badge>
                </div>
              </div>

              {/* Send Button */}
              <Button 
                onClick={handleSendEmail}
                className="w-full" 
                disabled={sendEmailMutation.isPending || getRecipientCount() === 0 || !emailSubject.trim() || !emailContent.trim()}
              >
                {sendEmailMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Campaign ({getRecipientCount()} recipients)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Status Card */}
          {!emailSubject && !emailContent && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">Getting Started</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  1. Choose a template or write your email
                </p>
                <p className="text-sm text-muted-foreground">
                  2. Select your recipients
                </p>
                <p className="text-sm text-muted-foreground">
                  3. Preview and send
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}