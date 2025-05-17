"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { type EnhancedA2AMessage } from "~/types/enhanced-a2a";

export interface MessageDetailModalProps {
  message: EnhancedA2AMessage;
  isOpen: boolean;
  onClose: () => void;
}

export function MessageDetailModal({ message, isOpen, onClose }: MessageDetailModalProps) {
  const formattedCreatedAt = typeof message.createdAt === 'string'
    ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
    : formatDistanceToNow(message.createdAt, { addSuffix: true });

  const formattedProcessedAt = message.processedAt
    ? typeof message.processedAt === 'string'
      ? formatDistanceToNow(new Date(message.processedAt), { addSuffix: true })
      : formatDistanceToNow(message.processedAt, { addSuffix: true })
    : 'Not processed yet';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Message Details</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold">Sender</h3>
              <p className="text-sm">{message.sender}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold">Recipient</h3>
              <p className="text-sm">{message.recipient}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold">Created</h3>
              <p className="text-sm">{formattedCreatedAt}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold">Type</h3>
              <p className="text-sm">{message.type}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold">Status</h3>
              <p className="text-sm">{message.status}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold">Processed</h3>
              <p className="text-sm">{formattedProcessedAt}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold">ID</h3>
              <p className="text-sm font-mono break-all">{message.id}</p>
            </div>
            
            {message.correlationId && (
              <div>
                <h3 className="text-sm font-semibold">Correlation ID</h3>
                <p className="text-sm font-mono break-all">{message.correlationId}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2">Payload</h3>
          <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
            {JSON.stringify(message.payload, null, 2)}
          </pre>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MessageDetailModal; 