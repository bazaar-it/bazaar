// src/app/projects/[id]/edit/PanelGroup.tsx
"use client";

import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

// Re-export components for now, but this gives us a place to add
// custom functionality or styling in the future
export { PanelGroup, Panel, PanelResizeHandle };

// We could add custom styled versions later, for example:
// export const StyledResizeHandle = ({ className, ...props }: PanelResizeHandleProps) => (
//   <PanelResizeHandle 
//     className={`w-1.5 bg-gray-200 hover:bg-blue-400 transition-colors ${className}`} 
//     {...props} 
//   />
// );

