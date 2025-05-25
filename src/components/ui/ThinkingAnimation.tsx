"use client";

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "~/lib/utils";

interface ThinkingAnimationProps {
  messages: string[];
  isActive: boolean;
  isComplete: boolean;
  isError: boolean;
  errorMessage?: string;
  minDisplayTime?: number; // in milliseconds
  className?: string;
}

export default function ThinkingAnimation({
  messages,
  isActive,
  isComplete,
  isError,
  errorMessage,
  minDisplayTime = 2000, // default 2 seconds
  className,
}: ThinkingAnimationProps) {
  const [visibleMessage, setVisibleMessage] = useState<string>(
    messages.length > 0 && messages[0] ? messages[0] : 'Processing...'
  );
  const [shouldShow, setShouldShow] = useState(true);
  const lastUpdateTime = useRef<number>(Date.now());
  const messageQueue = useRef<string[]>([]);
  const updateTimer = useRef<NodeJS.Timeout | null>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  // Log initial state for debugging
  useEffect(() => {
    console.log('[ThinkingAnimation] Initial render:', { 
      messageCount: messages.length, 
      isActive, 
      isComplete, 
      isError 
    });
  }, []);

  // Update visible message when messages array changes, but with minimum display time
  useEffect(() => {
    if (messages.length > 0) {
      console.log('[ThinkingAnimation] Messages updated:', messages);
      
      // Reset shouldShow to true whenever we receive new messages
      setShouldShow(true);
      
      // Cancel any pending hide timer when new messages arrive
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      
      const latestMessage = messages[messages.length - 1];
      
      // Don't update if message is identical to current or undefined
      if (!latestMessage || latestMessage === visibleMessage) return;
      
      // Add to queue
      messageQueue.current = [...messageQueue.current, latestMessage];
      console.log('[ThinkingAnimation] Added to queue:', latestMessage, 'Queue length:', messageQueue.current.length);
      
      // If no update is scheduled, schedule one
      if (!updateTimer.current) {
        const processQueue = () => {
          const now = Date.now();
          const timeElapsed = now - lastUpdateTime.current;
          
          // If minimum display time has passed, show next message
          if (timeElapsed >= minDisplayTime && messageQueue.current.length > 0) {
            const nextMessage = messageQueue.current.shift();
            if (nextMessage) {
              console.log('[ThinkingAnimation] Showing message:', nextMessage);
              setVisibleMessage(nextMessage);
              lastUpdateTime.current = now;
            }
            
            // If queue still has items, schedule next update
            if (messageQueue.current.length > 0) {
              updateTimer.current = setTimeout(processQueue, minDisplayTime);
            } else {
              updateTimer.current = null;
            }
          } else {
            // Not enough time has passed, check again after delay
            const waitTime = Math.max(minDisplayTime - timeElapsed, 100);
            updateTimer.current = setTimeout(processQueue, waitTime);
          }
        };
        
        // Start processing queue
        processQueue();
      }
    }
    
    // Cleanup timer on unmount
    return () => {
      if (updateTimer.current) {
        clearTimeout(updateTimer.current);
        updateTimer.current = null;
      }
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [messages, minDisplayTime, visibleMessage]);

  // Handle completion or error states
  useEffect(() => {
    console.log('[ThinkingAnimation] Status change:', { isComplete, isError });
    
    if (isComplete || isError) {
      // Clear any pending updates
      if (updateTimer.current) {
        clearTimeout(updateTimer.current);
        updateTimer.current = null;
      }
      
      // Show final message immediately
      if (messageQueue.current.length > 0) {
        const finalMessage = messageQueue.current[messageQueue.current.length - 1];
        if (finalMessage) {
          console.log('[ThinkingAnimation] Showing final message:', finalMessage);
          setVisibleMessage(finalMessage);
        }
        messageQueue.current = [];
      }
      
      // Only hide after delay - don't hide immediately
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
      
      hideTimer.current = setTimeout(() => {
        console.log('[ThinkingAnimation] Hiding animation after completion/error');
        setShouldShow(false);
        hideTimer.current = null;
      }, minDisplayTime * 1.5); // Use a longer timeout for final message
    } else {
      // Cancel any pending hide timer when active again
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      
      // Ensure we're showing the animation when active
      setShouldShow(true);
    }
    
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [isComplete, isError, minDisplayTime]);

  // Don't render if explicitly hidden or no messages provided
  // But DO render if we have messages, even if empty array was originally passed
  if (!shouldShow || (!messages.length && !visibleMessage)) {
    console.log('[ThinkingAnimation] Not rendering: shouldShow=', shouldShow, 'messages.length=', messages.length);
    return null;
  }

  return (
    <div 
      className={cn(
        "flex items-center font-medium text-sm w-full",
        isError ? "opacity-80" : "opacity-100",
        className
      )}
    >
      <div className={cn(
        "w-full rounded-md py-2 px-3",
        "relative overflow-hidden bg-muted/30",
        isActive && !isComplete && !isError ? "shimmer-container" : ""
      )}>
        {/* Shimmer effect - active only during processing */}
        {isActive && !isComplete && !isError && (
          <div className="shimmer-effect" />
        )}
        
        {/* Message content - single line, no extra spacing */}
        <p className="m-0 leading-tight whitespace-nowrap text-sm text-foreground/80 truncate">
          {visibleMessage || (messages.length > 0 ? messages[messages.length - 1] : 'Processing...')}
          {isError && errorMessage ? ` (${errorMessage})` : ''}
        </p>
      </div>
    </div>
  );
} 