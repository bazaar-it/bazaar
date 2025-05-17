"use client";

import { Card, CardHeader } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import { type EnhancedA2AMessage } from '~/types/enhanced-a2a';
import { formatDistanceToNow } from 'date-fns';

export interface MessagePreviewProps {
  message: EnhancedA2AMessage;
  preview: string;
  onClick: () => void;
}

export function MessagePreview({ message, preview, onClick }: MessagePreviewProps) {
  // Determine direction (outgoing from agent or incoming to agent)
  const isOutgoing = message.sender && message.recipient && message.sender !== 'user';
  
  // Format the timestamp
  const timestamp = typeof message.createdAt === 'string' 
    ? new Date(message.createdAt) 
    : message.createdAt;
  
  const formattedTime = formatDistanceToNow(timestamp, { addSuffix: true });
  
  return (
    <Card 
      className={cn(
        'cursor-pointer hover:bg-muted/50 transition-colors',
        isOutgoing ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-gray-500'
      )}
      onClick={onClick}
    >
      <CardHeader className="p-3">
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold">
              {message.type || 'Message'}
            </div>
            <div className="text-xs text-muted-foreground">
              {formattedTime}
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex justify-between">
            <span>{message.sender} → {message.recipient}</span>
          </div>
          <div className="text-sm mt-2 line-clamp-2">{preview}</div>
        </div>
      </CardHeader>
    </Card>
  );
}

export default MessagePreview; 