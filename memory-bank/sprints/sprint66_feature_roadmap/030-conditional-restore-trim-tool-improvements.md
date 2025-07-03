# Feature 30: Conditional Restore & Trim Tool Improvements

**Created**: January 2, 2025  
**Priority**: MEDIUM  
**Complexity**: MEDIUM (2 days)  
**Status**: Not Started  
**Feature Type**: UX Enhancement / Bug Fix

## Overview

Implement smart restore functionality that only shows when applicable, and improve trim tool naming/behavior to better reflect what it actually does (duration adjustment, not content editing).

## Current State

- Restore button shows for ALL operations but doesn't work for trim/duration changes
- Users get "restore successful" toast but nothing actually restores for trim operations
- Trim tool only changes duration, not actual scene content
- Confusing UX when restore appears but doesn't work
- No clear indication of what operations support restore

## User Problems

1. **False Restore Options**: Restore button appears for trim operations where it can't work
2. **Misleading Success Messages**: "Restore successful" shown even when nothing restored
3. **Confusing Terminology**: "Trim" suggests content editing but only affects duration
4. **No Visual Clarity**: Users can't tell which operations support restore
5. **Wasted Clicks**: Users try restore on duration changes expecting content changes

## Root Cause Analysis

The restore functionality was designed for operations that modify scene code (create, edit, delete), but the UI shows it for ALL operations including those that only modify metadata (trim, duration). Since trim operations don't store previous code versions, restore has nothing to restore to.

## Technical Implementation

### 1. Operation Type Tracking

```typescript
// types/operations.ts
export enum OperationType {
  // Code-modifying operations (can restore)
  CREATE = 'create',
  EDIT = 'edit',
  DELETE = 'delete',
  PASTE = 'paste',
  
  // Metadata-only operations (cannot restore)
  TRIM = 'trim',
  DURATION = 'duration',
  REORDER = 'reorder',
  RENAME = 'rename'
}

export interface OperationMetadata {
  type: OperationType;
  hasCodeChange: boolean;
  canRestore: boolean;
  previousCode?: string;
  previousDuration?: number;
  timestamp: Date;
}

// Helper to determine if operation supports restore
export function canRestoreOperation(type: OperationType): boolean {
  const restorableOperations = [
    OperationType.CREATE,
    OperationType.EDIT,
    OperationType.DELETE,
    OperationType.PASTE
  ];
  
  return restorableOperations.includes(type);
}
```

### 2. Message Metadata Enhancement

```typescript
// Update message creation to include operation metadata
interface MessageWithOperationData extends Message {
  operationType: OperationType;
  operationMetadata: OperationMetadata;
  sceneSnapshot?: {
    code: string;
    duration: number;
    position: number;
  };
}

// In generation router or message creation
async function createMessageWithMetadata(
  content: string,
  operationType: OperationType,
  sceneData?: any
) {
  const canRestore = canRestoreOperation(operationType);
  
  const metadata: OperationMetadata = {
    type: operationType,
    hasCodeChange: canRestore,
    canRestore,
    previousCode: canRestore && sceneData ? sceneData.previousCode : undefined,
    previousDuration: sceneData?.previousDuration,
    timestamp: new Date()
  };
  
  return await db.insert(messages).values({
    content,
    role: 'assistant',
    operationType,
    metadata: JSON.stringify(metadata),
    // ... other fields
  });
}
```

### 3. Conditional Restore UI

```typescript
// components/chat/ChatMessage.tsx
export function ChatMessage({ message }: { message: MessageWithOperationData }) {
  const showRestoreButton = useMemo(() => {
    // Only show restore for operations that support it
    if (!message.operationMetadata) return false;
    return message.operationMetadata.canRestore;
  }, [message.operationMetadata]);
  
  const operationIcon = useMemo(() => {
    switch (message.operationType) {
      case OperationType.CREATE:
        return <PlusCircle className="h-4 w-4" />;
      case OperationType.EDIT:
        return <Edit className="h-4 w-4" />;
      case OperationType.DELETE:
        return <Trash className="h-4 w-4" />;
      case OperationType.TRIM:
      case OperationType.DURATION:
        return <Clock className="h-4 w-4" />;
      case OperationType.PASTE:
        return <Clipboard className="h-4 w-4" />;
      default:
        return null;
    }
  }, [message.operationType]);
  
  return (
    <div className="message-container">
      <div className="message-header">
        {operationIcon}
        <span className="operation-type text-xs text-muted-foreground">
          {getOperationLabel(message.operationType)}
        </span>
      </div>
      
      <div className="message-content">
        {message.content}
      </div>
      
      <div className="message-actions">
        {showRestoreButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestore(message)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Restore to previous version
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* For duration changes, show different action */}
        {message.operationType === OperationType.DURATION && (
          <span className="text-xs text-muted-foreground">
            Duration changed from {message.operationMetadata.previousDuration}s
          </span>
        )}
      </div>
    </div>
  );
}

function getOperationLabel(type: OperationType): string {
  const labels: Record<OperationType, string> = {
    [OperationType.CREATE]: 'Scene created',
    [OperationType.EDIT]: 'Scene edited',
    [OperationType.DELETE]: 'Scene deleted',
    [OperationType.TRIM]: 'Duration adjusted',
    [OperationType.DURATION]: 'Duration changed',
    [OperationType.PASTE]: 'Code pasted',
    [OperationType.REORDER]: 'Scene reordered',
    [OperationType.RENAME]: 'Scene renamed'
  };
  
  return labels[type] || 'Operation';
}
```

### 4. Trim Tool Renaming

```typescript
// tools/trim/trim.ts - Rename and clarify
export const adjustDurationTool = {
  name: 'adjustDuration', // Changed from 'trim'
  description: 'Adjust scene duration without changing content',
  operationType: OperationType.DURATION,
  canRestore: false,
  
  schema: z.object({
    sceneId: z.string(),
    duration: z.number().positive(),
    unit: z.enum(['seconds', 'frames']).default('seconds')
  }),
  
  execute: async (input, context) => {
    const { sceneId, duration, unit } = input;
    
    // Store previous duration for UI display
    const previousDuration = context.scene.duration;
    
    // Convert to frames if needed
    const durationInFrames = unit === 'seconds' 
      ? Math.round(duration * context.fps)
      : duration;
    
    // Update only duration, not content
    await updateSceneDuration(sceneId, durationInFrames);
    
    return {
      success: true,
      operationType: OperationType.DURATION,
      metadata: {
        previousDuration,
        newDuration: duration,
        unit
      },
      message: `Scene duration adjusted to ${duration} ${unit}`
    };
  }
};

// Update UI labels
const TOOL_LABELS = {
  adjustDuration: {
    label: 'Adjust Duration',
    description: 'Change how long this scene plays',
    icon: Clock
  }
};
```

### 5. Restore Validation

```typescript
// hooks/useRestore.ts
export function useRestore() {
  const restoreScene = api.scenes.restore.useMutation();
  
  const handleRestore = async (message: MessageWithOperationData) => {
    // Validate restore is possible
    if (!message.operationMetadata?.canRestore) {
      toast.error('This operation cannot be restored');
      return;
    }
    
    if (!message.operationMetadata.previousCode) {
      toast.error('No previous version available');
      return;
    }
    
    try {
      await restoreScene.mutateAsync({
        messageId: message.id,
        sceneId: message.sceneId,
        previousCode: message.operationMetadata.previousCode
      });
      
      toast.success('Scene restored to previous version');
    } catch (error) {
      toast.error('Failed to restore scene');
      console.error('Restore error:', error);
    }
  };
  
  return { handleRestore };
}
```

### 6. Database Schema Updates

```sql
-- Add operation type to messages table
ALTER TABLE messages ADD COLUMN operation_type VARCHAR(50);
ALTER TABLE messages ADD COLUMN operation_metadata JSONB;

-- Index for operation type queries
CREATE INDEX idx_messages_operation_type ON messages(operation_type);

-- Update existing messages (migration)
UPDATE messages 
SET operation_type = 
  CASE 
    WHEN content LIKE '%created%' THEN 'create'
    WHEN content LIKE '%edited%' THEN 'edit'
    WHEN content LIKE '%deleted%' THEN 'delete'
    WHEN content LIKE '%duration%' OR content LIKE '%trim%' THEN 'duration'
    ELSE 'unknown'
  END
WHERE operation_type IS NULL;
```

## UI/UX Improvements

### 1. Visual Operation Indicators

```typescript
// Clear visual distinction between operation types
const OperationBadge = ({ type }: { type: OperationType }) => {
  const config = {
    [OperationType.CREATE]: { 
      color: 'green', 
      icon: PlusCircle, 
      label: 'Created' 
    },
    [OperationType.EDIT]: { 
      color: 'blue', 
      icon: Edit, 
      label: 'Edited' 
    },
    [OperationType.DELETE]: { 
      color: 'red', 
      icon: Trash, 
      label: 'Deleted' 
    },
    [OperationType.DURATION]: { 
      color: 'orange', 
      icon: Clock, 
      label: 'Duration' 
    },
    [OperationType.PASTE]: { 
      color: 'purple', 
      icon: Clipboard, 
      label: 'Pasted' 
    }
  };
  
  const { color, icon: Icon, label } = config[type] || {};
  
  return (
    <Badge variant="outline" className={`border-${color}-500 text-${color}-700`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
};
```

### 2. Operation History View

```typescript
// Show operation history with clear restore availability
export function OperationHistory({ sceneId }: { sceneId: string }) {
  const operations = useSceneOperations(sceneId);
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Operation History</h3>
      <div className="space-y-1">
        {operations.map((op) => (
          <div key={op.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <OperationBadge type={op.type} />
              <span className="text-sm">{op.description}</span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(op.timestamp)}
              </span>
            </div>
            {op.canRestore && (
              <Button size="xs" variant="ghost" onClick={() => restore(op)}>
                Restore
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Improved Error Messages

```typescript
// Clear messaging about what can/cannot be restored
const getRestoreErrorMessage = (operationType: OperationType): string => {
  switch (operationType) {
    case OperationType.DURATION:
    case OperationType.TRIM:
      return "Duration changes cannot be restored. Only content edits can be reverted.";
    case OperationType.REORDER:
      return "Scene order changes cannot be restored through this button.";
    case OperationType.RENAME:
      return "Name changes cannot be restored. Only content edits can be reverted.";
    default:
      return "This operation cannot be restored.";
  }
};
```

## Edge Cases to Handle

### 1. Pasted Code Operations
```typescript
// Pasted code should allow restore to pre-paste state
if (operationType === OperationType.PASTE) {
  // Store the code that existed before paste
  metadata.previousCode = currentScene.tsxCode;
  metadata.canRestore = true;
}
```

### 2. Multiple Rapid Operations
```typescript
// Track operation sequence for proper restore order
interface OperationChain {
  sceneId: string;
  operations: OperationMetadata[];
  currentIndex: number;
}

// Allow stepping through operation history
const restoreToPreviousState = (chain: OperationChain) => {
  if (chain.currentIndex > 0) {
    const targetOperation = chain.operations[chain.currentIndex - 1];
    return targetOperation.previousCode;
  }
  return null;
};
```

### 3. Concurrent User Edits
```typescript
// Add optimistic locking to prevent conflicts
interface SceneVersion {
  sceneId: string;
  version: number;
  lastModified: Date;
  modifiedBy: string;
}

// Check version before restore
const safeRestore = async (sceneId: string, targetCode: string, expectedVersion: number) => {
  const currentVersion = await getSceneVersion(sceneId);
  
  if (currentVersion.version !== expectedVersion) {
    throw new Error('Scene has been modified by another user');
  }
  
  // Proceed with restore
  await updateScene(sceneId, targetCode, currentVersion.version + 1);
};
```

## Testing Checklist

- [ ] Restore button only shows for code-changing operations
- [ ] No restore button for trim/duration operations
- [ ] Operation types correctly identified in UI
- [ ] "Trim" renamed to "Adjust Duration" throughout
- [ ] Restore actually works for edit/create/delete operations
- [ ] No false success messages for non-restorable operations
- [ ] Clear error messages when restore not available
- [ ] Operation badges show correct icons/colors
- [ ] Paste operations can be restored
- [ ] Duration changes show previous value
- [ ] Database migration completes successfully
- [ ] Performance not impacted by metadata storage

## Migration Strategy

1. **Phase 1**: Add operation tracking to new messages
2. **Phase 2**: Run migration to categorize existing messages
3. **Phase 3**: Update UI to show conditional restore
4. **Phase 4**: Rename trim tool and update labels
5. **Phase 5**: Monitor and fix edge cases

## Success Metrics

- Zero false "restore successful" messages
- Reduced user confusion about restore functionality
- Clear understanding of trim vs edit operations
- Fewer support tickets about restore not working
- Improved user satisfaction with operation clarity

## Future Enhancements

1. **Undo/Redo Stack**: Full operation history with multiple restore points
2. **Operation Diffing**: Show what changed between versions
3. **Batch Restore**: Restore multiple operations at once
4. **Time Travel**: Slider to move through scene history
5. **Collaborative Restore**: Handle multi-user restore conflicts