// Example UI implementation for undo/revert feature in ChatMessage component

import { Button } from "~/components/ui/button";
import { Undo2, History, GitBranch } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

// Enhanced ChatMessage component with revert functionality
export function ChatMessage({ 
  message, 
  onRevert,
  iterations, // Scene iterations linked to this message
  projectId 
}: ChatMessageProps) {
  const hasIterations = iterations && iterations.length > 0;
  const hasMultipleIterations = iterations && iterations.length > 1;

  return (
    <div className="group relative flex gap-3 p-4 hover:bg-gray-50 transition-colors">
      {/* Message content */}
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-900">{message.content}</p>
            {message.imageUrls && (
              <div className="mt-2 flex gap-2">
                {message.imageUrls.map((url, i) => (
                  <img key={i} src={url} className="h-20 w-20 rounded object-cover" />
                ))}
              </div>
            )}
          </div>

          {/* Revert actions - only show for assistant messages with iterations */}
          {!message.isUser && hasIterations && (
            <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
              {hasMultipleIterations ? (
                // Multiple scenes affected - show dropdown
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <GitBranch className="h-4 w-4 mr-1" />
                      Revert ({iterations.length} scenes)
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="p-2 text-xs text-gray-500">
                      This message affected multiple scenes:
                    </div>
                    {iterations.map((iter) => (
                      <DropdownMenuItem
                        key={iter.id}
                        onClick={() => onRevert?.(message.id, iter.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{iter.sceneName}</span>
                          <span className="text-xs text-gray-500">
                            {iter.operationType === 'create' && 'Created'}
                            {iter.operationType === 'edit' && `Edited: ${iter.editComplexity}`}
                            {iter.operationType === 'delete' && 'Deleted'}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      onClick={() => onRevert?.(message.id, 'all')}
                      className="border-t"
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Revert all changes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Single scene - simple button
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevert?.(message.id, iterations[0].id)}
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  Revert
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Show what changed (for assistant messages) */}
        {!message.isUser && hasIterations && (
          <div className="mt-2 text-xs text-gray-500">
            {iterations.length === 1 ? (
              <span>
                {iterations[0].operationType === 'create' && 'Created new scene'}
                {iterations[0].operationType === 'edit' && `Edited scene: ${iterations[0].sceneName}`}
                {iterations[0].operationType === 'delete' && `Deleted scene: ${iterations[0].sceneName}`}
              </span>
            ) : (
              <span>Modified {iterations.length} scenes</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Example confirmation modal for reverting
export function RevertConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  iteration,
  message 
}: RevertModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revert to Previous Version?</DialogTitle>
          <DialogDescription>
            This will restore the scene to the state after: "{message.content}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Show before/after preview if possible */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Current Version</h4>
              <div className="border rounded p-2 bg-gray-50 h-32 overflow-hidden">
                <pre className="text-xs">
                  {/* Show current code snippet */}
                  {currentScene?.tsxCode?.substring(0, 200)}...
                </pre>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Will Revert To</h4>
              <div className="border rounded p-2 bg-blue-50 h-32 overflow-hidden">
                <pre className="text-xs">
                  {/* Show version we're reverting to */}
                  {iteration.codeAfter?.substring(0, 200)}...
                </pre>
              </div>
            </div>
          </div>

          {/* Warning if newer changes exist */}
          {hasNewerChanges && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This scene has been edited after this version. 
                Reverting will overwrite those changes.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <Undo2 className="h-4 w-4 mr-2" />
            Revert Scene
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}