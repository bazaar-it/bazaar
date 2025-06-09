//src/components/InsertCustomComponentButton.tsx
import React from "react";

// Note: Replace these imports with actual paths in your project
// Button component simplified for demonstration
const Button: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  size?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, children, className }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={className}
  >
    {children}
  </button>
);

// Import API from your tRPC setup
import { api } from "~/trpc/react";
import { v4 as uuid } from "uuid";
import type { JsonPatch } from "~/lib/types/shared/json-patch";
import { type TRPCClientErrorLike } from "@trpc/client";

// Simple toast implementation
const useToast = () => {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      console.log(`Toast: ${props.title} - ${props.description}`);
    }
  };
};

interface InsertCustomComponentButtonProps {
  componentId: string;
  projectId: string;
  onSuccess?: () => void;
  label?: string;
}

/**
 * Button component for inserting a custom component into the timeline
 * 
 * Creates a JSON patch to add a new scene with the custom component.
 * 
 * @param componentId UUID of the custom component job
 * @param projectId UUID of the current project
 * @param onSuccess Optional callback for when the scene is added successfully
 * @param label Optional custom button label
 */
export function InsertCustomComponentButton({ 
  componentId,
  projectId,
  onSuccess,
  label = "Add to Timeline"
}: InsertCustomComponentButtonProps) {
  const { toast } = useToast();
  const insertPatch = api.project.patch.useMutation({
    onSuccess: () => {
      toast({
        title: "Custom component added",
        description: "The component has been added to your timeline.",
        variant: "default",
      });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast({
        title: "Failed to add component",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  });
  
  const handleInsert = async () => {
    // Add a new scene with the custom component
    const newScene = {
      id: uuid(),
      type: "custom",
      start: 0, // This will be positioned by the editor or at the end
      duration: 90, // Default duration
      data: {
        componentId,
      }
    };
    
    // Apply the JSON patch to add the new scene
    const patchOperation: JsonPatch = [
      { op: "add", path: "/scenes/-", value: newScene }
    ];
    
    await insertPatch.mutateAsync({
      projectId,
      patch: patchOperation
    });
  };
  
  return (
    <Button 
      onClick={handleInsert}
      disabled={insertPatch.isPending}
      size="sm"
      className="mt-2"
    >
      {insertPatch.isPending ? "Adding..." : label}
    </Button>
  );
}
