// src/client/components/a2a/AgentMessageList.tsx

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { formatDistanceToNow } from 'date-fns';
import type { AgentMessageData } from '~/types/a2a';

interface AgentMessageListProps {
  messages: AgentMessageData[];
  title?: string;
  maxHeight?: string;
  emptyMessage?: string;
}

export const AgentMessageList: React.FC<AgentMessageListProps> = ({
  messages,
  title = 'Agent Messages',
  maxHeight = '500px',
  emptyMessage = 'No messages yet. Messages will appear here when agents communicate.'
}) => {
  // Log messages for debugging purposes
  useEffect(() => {
    if (messages.length > 0) {
      console.log(`[AgentMessageList] Received ${messages.length} messages:`, messages);
    }
  }, [messages]);

  // Sort messages by timestamp (newest first)
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [messages]);

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs mt-1">
              Last updated: {messages.length > 0 ? new Date().toLocaleTimeString() : 'N/A'}
            </CardDescription>
          </div>
          <Badge variant={messages.length > 0 ? "secondary" : "outline"} className="ml-2">
            {messages.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {messages.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div className="px-2">
              <Accordion type="multiple" className="w-full">
                {sortedMessages.map((message, index) => (
                  <AccordionItem key={message.message_id || index} value={message.message_id || `message-${index}`}>
                    <AccordionTrigger className="px-4 py-2 hover:bg-muted/50 rounded-md">
                      <div className="flex flex-col items-start text-left w-full">
                        <div className="flex items-center w-full justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{message.from}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold">{message.to}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {message.type}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      <div className="mt-2 bg-muted/30 p-3 rounded-md">
                        <pre className="text-xs whitespace-pre-wrap font-mono overflow-x-auto">
                          {JSON.stringify(message.payload, null, 2)}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
