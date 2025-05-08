// src/app/projects/[id]/edit/panels/CodePanel.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { PlayIcon, CopyIcon, CheckIcon, XIcon } from "lucide-react";
import { useVideoState } from "~/stores/videoState";
import { useParams } from "next/navigation";

export default function CodePanel({ onClose }: { onClose?: () => void }) {
  const { id: projectId } = useParams<{ id: string }>();
  const { getCurrentProps, applyPatch } = useVideoState();
  const inputProps = getCurrentProps();
  const [jsonString, setJsonString] = useState<string>("");
  const [editorContent, setEditorContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const formatted = JSON.stringify(inputProps, null, 2);
    setJsonString(formatted);
    setEditorContent(formatted);
  }, [inputProps]);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editorContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };
  
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorContent(e.target.value);
    setError(null); // Clear any previous errors
  };
  
  const handleRunCode = () => {
    try {
      // Parse the editor content
      const newProps = JSON.parse(editorContent);
      
      // Apply the changes directly to the video state
      applyPatch(projectId, newProps);
      
      // Update our local state with the new string
      setJsonString(editorContent);
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error("Failed to run code: ", err);
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="font-medium text-sm">Code</span>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={copyToClipboard}
          >
            {copied ? (
              <><CheckIcon className="h-3 w-3 mr-1" /> Copy</>
            ) : (
              <><CopyIcon className="h-3 w-3 mr-1" /> Copy</>
            )}
          </Button>
          <Button 
            variant="default" 
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleRunCode}
          >
            <PlayIcon className="h-3 w-3 mr-1" /> Run
          </Button>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100"
            aria-label="Close Code panel"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-600 text-sm">
          Error: {error}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-1">
        <textarea 
          className="w-full h-full text-xs font-mono p-4 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          value={editorContent}
          onChange={handleEditorChange}
          spellCheck={false}
          placeholder="Edit JSON configuration..."
        />
      </div>
    </div>
  );
} 