"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/tabs";
import { Button } from "~/components/ui/button";
import { 
  Folder, 
  FileText, 
  Video, 
  Upload, 
  Plus, 
  PlusCircle,
  MoreVertical,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { api } from "~/trpc/react";
import { useToast } from "~/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface Project {
  id: string;
  name: string;
  type: string;
  isActive?: boolean;
  // Fallback fields for compatibility
  title?: string;
  // Add other project properties as needed
}

interface FileItem {
  id: string;
  name: string;
  type: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  thumbnailUrl?: string;
}

interface FilesTabProps {
  children: React.ReactNode;
  emptyState: {
    icon: React.FC<{ className?: string }>;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  items?: FileItem[];
  renderItem?: (item: FileItem) => React.ReactNode;
}

// Reusable component for each tab's content
const FilesTab: React.FC<FilesTabProps> = ({ 
  children, 
  emptyState, 
  items = [], 
  renderItem 
}) => {
  const Icon = emptyState.icon;
  
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Icon className="mb-2 h-16 w-16 text-muted-foreground" />
        <h3 className="mb-1 text-lg font-medium">{emptyState.title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {emptyState.description}
        </p>
        {emptyState.actionLabel && (
          <Button 
            onClick={emptyState.onAction} 
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            <span>{emptyState.actionLabel}</span>
          </Button>
        )}
      </div>
    );
  }
  
  return <>{children}</>;
};

// File item component with context menu
const FileItem = ({ 
  item, 
  onRename, 
  onDelete, 
  onClick 
}: { 
  item: FileItem; 
  onRename: (id: string) => void; 
  onDelete: (id: string) => void; 
  onClick?: (id: string) => void;
}) => {
  return (
    <div 
      className={`relative cursor-pointer rounded-md overflow-hidden transition-all border min-h-[140px] ${
        item.isActive 
          ? "ring-2 ring-primary ring-offset-2" 
          : "border-gray-200 hover:border-gray-400"
      }`}
      onClick={() => onClick?.(item.id)}
    >
      {/* Preview content - this will vary based on file type */}
      <div className="aspect-video w-full bg-black min-h-[100px]">
        {item.type === 'project' && (
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            src={`/api/projects/${item.id}/preview.mp4`}
            poster={item.thumbnailUrl || `/api/projects/${item.id}/thumbnail.jpg`}
          />
        )}
        {item.type === 'template' && (
          <div className="w-full h-full flex items-center justify-center text-white">
            <FileText className="h-12 w-12" />
          </div>
        )}
        {item.type === 'scene' && (
          <div className="w-full h-full flex items-center justify-center text-white bg-gradient-to-br from-indigo-500 to-purple-600">
            <Video className="h-12 w-12" />
          </div>
        )}
        {item.type === 'upload' && (
          <div className="w-full h-full flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-teal-400">
            <Upload className="h-12 w-12" />
          </div>
        )}
      </div>
      
      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Title and context menu */}
      <div className="p-2 bg-white dark:bg-gray-800 flex justify-between items-center">
        <h3 className="font-medium text-sm truncate">{item.name}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onRename(item.id);
            }}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

interface FilesPanelProps {
  projects?: Project[];
  currentProjectId?: string;
  initialTab?: string;
}

export default function FilesPanel({ projects = [], currentProjectId, initialTab = "projects" }: FilesPanelProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const router = useRouter();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  
  // State for file items
  const [uploads, setUploads] = useState<FileItem[]>([]);
  const [scenes, setScenes] = useState<FileItem[]>([]);
  const [templates, setTemplates] = useState<FileItem[]>([]);
  
  // State for dialogs
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [currentFileType, setCurrentFileType] = useState<string | null>(null);
  
  // Fetch data from API
  const projectsQuery = api.project.list.useQuery();
  const scenesQuery = api.scene.list.useQuery();
  const templatesQuery = api.template.list.useQuery();
  const uploadsQuery = api.upload.list.useQuery();
  
  // Mutations
  const deleteProjectMutation = api.project.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Project deleted",
        description: "The project was successfully deleted."
      });
      projectsQuery.refetch();
    }
  });
  
  const renameProjectMutation = api.project.rename.useMutation({
    onSuccess: () => {
      toast({
        title: "Project renamed",
        description: "The project was successfully renamed."
      });
      projectsQuery.refetch();
    }
  });
  
  const deleteSceneMutation = api.scene.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Scene deleted",
        description: "The scene was successfully deleted."
      });
      scenesQuery.refetch();
    }
  });
  
  const renameSceneMutation = api.scene.rename.useMutation({
    onSuccess: () => {
      toast({
        title: "Scene renamed",
        description: "The scene was successfully renamed."
      });
      scenesQuery.refetch();
    }
  });
  
  const deleteTemplateMutation = api.template.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Template deleted",
        description: "The template was successfully deleted."
      });
      templatesQuery.refetch();
    }
  });
  
  const renameTemplateMutation = api.template.rename.useMutation({
    onSuccess: () => {
      toast({
        title: "Template renamed",
        description: "The template was successfully renamed."
      });
      templatesQuery.refetch();
    }
  });
  
  const deleteUploadMutation = api.upload.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "File deleted",
        description: "The uploaded file was successfully deleted."
      });
      uploadsQuery.refetch();
    }
  });
  
  const renameUploadMutation = api.upload.rename.useMutation({
    onSuccess: () => {
      toast({
        title: "File renamed",
        description: "The uploaded file was successfully renamed."
      });
      uploadsQuery.refetch();
    }
  });
  
  const uploadFileMutation = api.upload.create.useMutation({
    onSuccess: () => {
      toast({
        title: "File uploaded",
        description: "Your file was successfully uploaded."
      });
      uploadsQuery.refetch();
    }
  });
  
  // Update state when data is loaded
  useEffect(() => {
    if (uploadsQuery.data) {
      setUploads(uploadsQuery.data.map(upload => ({
        id: upload.id,
        name: upload.name,
        type: 'upload',
        createdAt: upload.createdAt,
        updatedAt: upload.updatedAt
      })));
    }
  }, [uploadsQuery.data]);
  
  useEffect(() => {
    if (scenesQuery.data) {
      setScenes(scenesQuery.data.map(scene => ({
        id: scene.id,
        name: scene.name,
        type: 'scene',
        createdAt: scene.createdAt,
        updatedAt: scene.updatedAt
      })));
    }
  }, [scenesQuery.data]);
  
  useEffect(() => {
    if (templatesQuery.data) {
      setTemplates(templatesQuery.data.map(template => ({
        id: template.id,
        name: template.name,
        type: 'template',
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      })));
    }
  }, [templatesQuery.data]);

  // Add an effect to initiate tab switch when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle file drop anywhere in the panel
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Show loading toast
      toast({
        title: "Uploading files",
        description: `Uploading ${e.dataTransfer.files.length} file(s)...`
      });
      
      // Upload each file
      for (const file of Array.from(e.dataTransfer.files)) {
        try {
          // Create FormData for the file
          const formData = new FormData();
          formData.append("file", file);
          
          // Upload the file using your API
          await uploadFileMutation.mutateAsync({ 
            name: file.name,
            type: file.type,
            size: file.size,
            file: formData
          });
        } catch (error) {
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive"
          });
        }
      }
      
      // Automatically switch to uploads tab after dropping files
      setActiveTab("uploads");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Show loading toast
      toast({
        title: "Uploading files",
        description: `Uploading ${e.target.files.length} file(s)...`
      });
      
      // Upload each file
      for (const file of Array.from(e.target.files)) {
        try {
          // Create FormData for the file
          const formData = new FormData();
          formData.append("file", file);
          
          // Upload the file using your API
          await uploadFileMutation.mutateAsync({ 
            name: file.name,
            type: file.type,
            size: file.size,
            file: formData
          });
        } catch (error) {
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive"
          });
        }
      }
      
      // Automatically switch to uploads tab after selecting files
      setActiveTab("uploads");
    }
  };

  const handleProjectClick = (projectId: string) => {
    if (projectId !== currentProjectId) {
      router.push(`/projects/${projectId}/edit`);
    }
  };
  
  const handleRenameFile = (id: string) => {
    let item: FileItem | undefined;
    let type = '';
    
    if (activeTab === "projects") {
      const project = projects.find(p => p.id === id);
      if (project) {
        item = { id: project.id, name: project.name, type: 'project' };
        type = 'project';
      }
    } else if (activeTab === "scenes") {
      item = scenes.find(s => s.id === id);
      type = 'scene';
    } else if (activeTab === "templates") {
      item = templates.find(t => t.id === id);
      type = 'template';
    } else if (activeTab === "uploads") {
      item = uploads.find(u => u.id === id);
      type = 'upload';
    }
    
    if (item) {
      setCurrentFileId(id);
      setCurrentFileName(item.name);
      setNewFileName(item.name);
      setCurrentFileType(type);
      setRenameDialogOpen(true);
    }
  };
  
  const handleConfirmRename = () => {
    if (!currentFileId || !currentFileType || !newFileName.trim()) return;
    
    switch (currentFileType) {
      case 'project':
        renameProjectMutation.mutate({ id: currentFileId, title: newFileName });
        break;
      case 'scene':
        renameSceneMutation.mutate({ id: currentFileId, name: newFileName });
        break;
      case 'template':
        renameTemplateMutation.mutate({ id: currentFileId, name: newFileName });
        break;
      case 'upload':
        renameUploadMutation.mutate({ id: currentFileId, name: newFileName });
        break;
    }
    
    setRenameDialogOpen(false);
  };
  
  const handleDeleteFile = (id: string) => {
    let item: FileItem | undefined;
    let type = '';
    
    if (activeTab === "projects") {
      const project = projects.find(p => p.id === id);
      if (project) {
        item = { id: project.id, name: project.name, type: 'project' };
        type = 'project';
      }
    } else if (activeTab === "scenes") {
      item = scenes.find(s => s.id === id);
      type = 'scene';
    } else if (activeTab === "templates") {
      item = templates.find(t => t.id === id);
      type = 'template';
    } else if (activeTab === "uploads") {
      item = uploads.find(u => u.id === id);
      type = 'upload';
    }
    
    if (item) {
      setCurrentFileId(id);
      setCurrentFileName(item.name);
      setCurrentFileType(type);
      setDeleteDialogOpen(true);
    }
  };
  
  const handleConfirmDelete = () => {
    if (!currentFileId || !currentFileType) return;
    
    switch (currentFileType) {
      case 'project':
        deleteProjectMutation.mutate({ id: currentFileId });
        break;
      case 'scene':
        deleteSceneMutation.mutate({ id: currentFileId });
        break;
      case 'template':
        deleteTemplateMutation.mutate({ id: currentFileId });
        break;
      case 'upload':
        deleteUploadMutation.mutate({ id: currentFileId });
        break;
    }
    
    setDeleteDialogOpen(false);
  };
  
  // Simpler project items mapping since projects are already formatted
  const projectItems = projects;

  // Add this CSS class at the component start (after the imports)
  // This will ensure a consistent grid layout across all tabs
  const gridStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem'
  };

  return (
    <div 
      className="flex h-full flex-col overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* File drop overlay - shows when dragging files */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center">
            <Upload className="h-16 w-16 mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-bold mb-2">Drop Files to Upload</h3>
            <p className="text-sm text-gray-500">
              Files will be uploaded to your account
            </p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
        <TabsList className="grid grid-cols-4 mb-2">
          <TabsTrigger value="projects" className="flex items-center justify-center">
            Projects
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center justify-center">
            Templates
          </TabsTrigger>
          <TabsTrigger value="scenes" className="flex items-center justify-center">
            Scenes
          </TabsTrigger>
          <TabsTrigger value="uploads" className="flex items-center justify-center">
            Uploads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="flex-1 overflow-auto h-full pt-1">
          <FilesTab
            emptyState={{
              icon: Folder,
              title: "No projects found",
              description: "You haven't created any projects yet.",
              actionLabel: "Create New Project",
              onAction: () => router.push("/projects/new")
            }}
            items={projectItems}
          >
            <div style={gridStyles} className="pb-4 px-2">
              {projectItems.map((project) => (
                <FileItem
                  key={project.id}
                  item={project}
                  onRename={handleRenameFile}
                  onDelete={handleDeleteFile}
                  onClick={handleProjectClick}
                />
              ))}
            </div>
          </FilesTab>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 overflow-auto h-full pt-1">
          <FilesTab
            emptyState={{
              icon: FileText,
              title: "No templates found",
              description: "You haven't created any templates yet.",
              actionLabel: "Create Template",
              onAction: () => {
                toast({
                  title: "Coming Soon",
                  description: "Template creation functionality will be available soon."
                });
              }
            }}
            items={templates}
          >
            <div style={gridStyles} className="pb-4 px-2">
              {templates.map((template) => (
                <FileItem
                  key={template.id}
                  item={template}
                  onRename={handleRenameFile}
                  onDelete={handleDeleteFile}
                />
              ))}
            </div>
          </FilesTab>
        </TabsContent>

        <TabsContent value="scenes" className="flex-1 overflow-auto h-full pt-1">
          <FilesTab
            emptyState={{
              icon: Video,
              title: "No saved scenes",
              description: "Create and save reusable scenes for your videos.",
              actionLabel: "Create Scene",
              onAction: () => {
                toast({
                  title: "Creating Scene",
                  description: "Navigate to a project and save a scene to create it."
                });
              }
            }}
            items={scenes}
          >
            <div style={gridStyles} className="pb-4 px-2">
              {scenes.map((scene) => (
                <FileItem
                  key={scene.id}
                  item={scene}
                  onRename={handleRenameFile}
                  onDelete={handleDeleteFile}
                />
              ))}
            </div>
          </FilesTab>
        </TabsContent>

        <TabsContent value="uploads" className="flex-1 overflow-auto h-full pt-1">
          <FilesTab
            emptyState={{
              icon: Upload,
              title: "No uploads yet",
              description: "Upload media files to use in your projects.",
              actionLabel: "Upload Files",
              onAction: () => document.getElementById('file-upload')?.click()
            }}
            items={uploads}
          >
            <div className="pb-4 px-2">
              {/* Upload zone */}
              <div className="border border-dashed border-gray-300 rounded-md py-3 px-4 mb-4 bg-gray-50/50 flex flex-wrap items-center">
                <p className="text-sm text-gray-600 mr-2 whitespace-nowrap">Drop files anywhere on this tab or</p>
                <label 
                  htmlFor="file-upload" 
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer mt-0 sm:mt-0"
                >
                  Select Files
                  <input 
                    id="file-upload"
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              
              {/* File grid */}
              <div style={gridStyles}>
                {uploads.map((file) => (
                  <FileItem
                    key={file.id}
                    item={file}
                    onRename={handleRenameFile}
                    onDelete={handleDeleteFile}
                  />
                ))}
              </div>
            </div>
          </FilesTab>
        </TabsContent>
      </Tabs>
      
      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {currentFileType}</DialogTitle>
            <DialogDescription>
              Enter a new name for "{currentFileName}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              value={newFileName} 
              onChange={(e) => setNewFileName(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRename}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {currentFileType}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentFileName}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 