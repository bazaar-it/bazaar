//src/components/ShareDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@bazaar/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@bazaar/ui";
import { Input } from "@bazaar/ui";
import { Label } from "@bazaar/ui";
import { Textarea } from "@bazaar/ui";
import { Switch } from "@bazaar/ui";
import { 
  Share2, 
  Copy, 
  ExternalLink, 
  Trash2, 
  Eye, 
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";

interface ShareDialogProps {
  projectId: string;
  projectTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShareData {
  id: string;
  title: string | null;
  description: string | null;
  viewCount: number;
  createdAt: Date;
  shareUrl: string;
  project?: {
    title: string;
  };
}

// Utility function to generate share URL
import { getBaseUrl } from "~/config/site";

const getShareUrl = (shareId: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || getBaseUrl();
  return `${baseUrl}/share/${shareId}`;
};

export function ShareDialog({ projectId, projectTitle, open, onOpenChange }: ShareDialogProps) {
  const [title, setTitle] = useState(projectTitle || "");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [expirationDays, setExpirationDays] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Query existing shares - using getMyShares to get all user's shares
  const { data: allShares, refetch: refetchShares } = api.share.getMyShares.useQuery(
    undefined,
    { enabled: open }
  );

  // Filter shares that belong to this project (by matching project title)
  const existingShares = (allShares?.filter((share: ShareData) => 
    share.project?.title === projectTitle
  ) || []);

  // Create share mutation
  const createShare = api.share.createShare.useMutation({
    onSuccess: (data: { shareId: string; shareUrl: string }) => {
      toast.success("Share link created successfully!");
      void refetchShares();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create share link");
    },
  });

  // Delete share mutation
  const deleteShareMutation = api.share.deleteShare.useMutation({
    onSuccess: () => {
      toast.success("Share link deleted successfully!");
      void refetchShares();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete share link");
    },
  });

  const handleCreateShare = async () => {
    if (!title.trim()) return;
    
    setIsCreating(true);
    setCreateError(null);
    
    try {
      await createShare.mutateAsync({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      
      toast.success("Share link created successfully!");
      
      // Reset form
      setTitle("");
      setDescription("");
      
      // Refresh shares list
      await refetchShares();
      
    } catch (error: any) {
      console.error("Error creating share:", error);
      toast.error("Failed to create share link");
      setCreateError(error.message || "Failed to create share link");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleDeleteShare = (shareId: string) => {
    if (confirm("Are you sure you want to delete this share link? This cannot be undone.")) {
      deleteShareMutation.mutate({ shareId });
    }
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(projectTitle || "");
      setDescription("");
      setExpirationDays(null);
    }
  }, [open, projectTitle]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Video
          </DialogTitle>
          <DialogDescription>
            Create public share links for your video project. Anyone with the link can view your video.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Share */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
            <h3 className="font-semibold">Create New Share Link</h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="share-title">Title</Label>
                <Input
                  id="share-title"
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  placeholder="Enter video title..."
                  className="mt-1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="share-description">Description (Optional)</Label>
                <Textarea
                  id="share-description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  placeholder="Add a description for your video..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is-public">Public Link</Label>
                  <p className="text-sm text-gray-600">Anyone with the link can view</p>
                </div>
                <Switch
                  id="is-public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              {/* Note: Expiration is not yet implemented in the backend */}
              <div className="opacity-50">
                <Label htmlFor="expiration">Expiration (Coming Soon)</Label>
                <select
                  id="expiration"
                  value={expirationDays || ""}
                  onChange={(e) => setExpirationDays(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
                  disabled
                >
                  <option value="">Never expires</option>
                  <option value="1">1 day</option>
                  <option value="7">1 week</option>
                  <option value="30">1 month</option>
                  <option value="90">3 months</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleCreateShare}
              disabled={isCreating || !title.trim()}
              className="w-full"
            >
              {isCreating ? "Creating..." : "Create Share Link"}
            </Button>
          </div>

          {/* Existing Shares */}
          <div>
            <h3 className="font-semibold mb-4">Existing Share Links</h3>
            
            {existingShares && existingShares.length > 0 ? (
              <div className="space-y-3">
                {existingShares.map((share: ShareData) => {
                  const shareUrl = getShareUrl(share.id);
                  
                  return (
                    <div
                      key={share.id}
                      className="p-4 border rounded-lg bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{share.title || "Untitled"}</h4>
                          {share.description && (
                            <p className="text-sm text-gray-600 mt-1">{share.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {share.viewCount} {share.viewCount === 1 ? 'view' : 'views'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Created {formatDate(new Date(share.createdAt))}
                            </div>
                          </div>

                          <div className="mt-3 p-2 bg-gray-50 rounded border text-sm font-mono truncate">
                            {shareUrl}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(shareUrl)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(shareUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteShare(share.id)}
                            disabled={deleteShareMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Share2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No share links created yet</p>
                <p className="text-sm">Create your first share link above</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
