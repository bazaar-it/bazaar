/**
 * Test script to verify UI imports are working correctly
 */

import { 
  Button, 
  Input, 
  Card, 
  Dialog,
  Select,
  Tabs,
  cn,
  SidebarFeedbackButton,
  FeedbackButton,
  ThinkingAnimation
} from "@bazaar/ui";

console.log("✅ All UI imports resolved successfully!");
console.log("Available imports:", {
  Button: typeof Button,
  Input: typeof Input,
  Card: typeof Card,
  Dialog: typeof Dialog,
  Select: typeof Select,
  Tabs: typeof Tabs,
  cn: typeof cn,
  SidebarFeedbackButton: typeof SidebarFeedbackButton,
  FeedbackButton: typeof FeedbackButton,
  ThinkingAnimation: typeof ThinkingAnimation
});