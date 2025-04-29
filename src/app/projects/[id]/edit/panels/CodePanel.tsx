// src/app/projects/[id]/edit/panels/CodePanel.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { PlayIcon, CopyIcon, CheckIcon } from "lucide-react";
import { useVideoState } from "~/stores/videoState";

export default function CodePanel() {
  const { getCurrentProps } = useVideoState();
const inputProps = getCurrentProps();
  const [jsonString, setJsonString] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    const formatted = JSON.stringify(inputProps, null, 2);
    setJsonString(formatted);
  }, [inputProps]);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Video Data</h2>
          <p className="text-sm text-muted-foreground">Current video configuration</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={copyToClipboard}
          >
            {copied ? (
              <><CheckIcon className="h-4 w-4" /> Copied</>
            ) : (
              <><CopyIcon className="h-4 w-4" /> Copy</>
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-1">
        <pre className="text-xs bg-muted p-4 rounded-md overflow-auto h-full">
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
} 