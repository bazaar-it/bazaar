# Custom Component Pipeline

This document provides a comprehensive overview of the custom component pipeline in Bazaar-Vid, detailing how custom Remotion components are generated, built, and displayed in the video preview.

## Pipeline Overview

The custom component pipeline consists of several interconnected stages:

1. **Animation Design Brief (ADB) Generation**
   - LLM creates structured JSON describing animations
   - Saved to the `animationDesignBriefs` table
   
2. **Component Code Generation**
   - LLM generates TSX based on the ADB
   - TSX code saved to `customComponentJobs` table
   
3. **Component Building**
   - TSX code compiled using esbuild
   - Compiled JS uploaded to R2 storage
   - Output URL saved to `customComponentJobs` table
   
4. **Component Display in Preview**
   - Frontend fetches component bundle via API
   - RemoteComponent hook dynamically loads JS bundle
   - Component renders in the Remotion preview

## User Interface Integration

The custom component pipeline is integrated into the user interface through several key touchpoints:

1. **Scene Planning History Panel**
   - Displays scene plans with associated ADBs
   - Visualizes Animation Design Brief details:
     - Color palette with color swatches
     - Element-by-element breakdown
     - Animation timing details
     - Component status with visual indicators
   - Provides collapsible sections for detailed information
   - Shows component job status alongside briefs

2. **Preview Panel**
   - Renders the Remotion player with custom components
   - Dynamically loads component bundles at runtime
   - Displays loading and error states

## API Design

The pipeline exposes several API endpoints for component management:

1. **Component Serving**
   - `/api/components/[componentId]` - Redirects to R2 storage for component bundles
   - `/api/components/[componentId]/metadata` - Fetches job metadata including ADB ID
   - `/api/animation-design-briefs/[briefId]` - Retrieves ADB data

2. **tRPC Endpoints**
   - `customComponent.getJobById` - Gets component job details
   - `customComponent.listByProject` - Lists all components for a project
   - `animationDesignBrief.getAllForProject` - Gets all ADBs for a project

## Technical Implementation

### Frontend Component Loading

The `RemoteComponent` hook handles dynamic loading of component bundles:

1. Creates a script tag to load the JS bundle from the API
2. Makes global dependencies (React, Remotion) available to the component
3. Waits for the component to register itself via `window.__REMOTION_COMPONENT`
4. Returns a component that renders the loaded component or error/loading states

### CustomScene Integration

The `CustomScene` component handles integration with the Remotion pipeline:

1. Gets component ID from scene data
2. Fetches component metadata to find associated ADB ID
3. Fetches the Animation Design Brief data
4. Renders the `RemoteComponent` with the ADB as the `brief` prop
5. Shows appropriate loading and error states

### Animation Design Brief Visualization

The `ScenePlanningHistoryPanel` provides a detailed visualization of ADBs:

1. Shows color palette with visual color swatches
2. Lists scene elements with type indicators
3. Displays animation timing details
4. Shows component build status
5. Updates in real-time as components are built

## Image Handling

### Current Implementation (Shapes-Only Approach)

As of Sprint 15, we've implemented a temporary solution for handling images in custom components. This approach focuses on getting animations working reliably first, before tackling the more complex issue of asset management.

Components currently **do not support external image assets**. Instead, they use CSS-styled divs, SVG shapes, and animations. The LLM is instructed to create visual elements without referencing image files. Image-like elements are implemented using colored shapes and gradients.

## Common Issues & Troubleshooting

### Component Not Loading
- Check if the component build completed successfully (`status: "complete"`)
- Verify the component has a valid `outputUrl` in the database
- Look for browser console errors related to script loading

### Animation Issues
- Verify the Animation Design Brief is being successfully fetched
- Check that the component is properly using the `brief` prop
- Inspect the component code for animation implementation issues

## Future Roadmap

1. **Asset Management System**
   - User-uploaded image support
   - Secure asset storage and retrieval
   - ADB schema extensions for asset references

2. **Enhanced Component Editor**
   - Component preview and testing tools
   - Parameter adjustment interface
   - Live editing capabilities

3. **Performance Optimizations**
   - Component bundle size reduction
   - Lazy loading improvements
   - Caching strategies

## Database Schema

The system relies on two main tables:

**animationDesignBriefs**
- `id`: UUID primary key
- `projectId`: Project ID reference
- `sceneId`: Scene ID within the project
- `status`: 'pending' | 'complete' | 'error'
- `designBrief`: JSON object containing the structured animation design
- `metadata`: JSON object with additional information

**customComponentJobs**
- `id`: UUID primary key 
- `projectId`: Project ID reference
- `effect`: String describing the component effect
- `status`: 'pending' | 'building' | 'complete' | 'error'
- `tsxCode`: The LLM-generated TypeScript code
- `outputUrl`: URL to the compiled JS bundle on R2
- `metadata`: JSON containing the `animationDesignBriefId` and other info

## Frontend Integration

### Component Loading Flow

1. **Scene Detection**
   - `DynamicVideo` composition renders scenes within `<Sequence>` elements
   - For `type: "custom"` scenes, the `CustomScene` component is used

2. **CustomScene Component**
   - Receives `componentId` in the `data` prop
   - Uses `delayRender`/`continueRender` for asynchronous loading
   - Fetches component metadata to get the associated `animationDesignBriefId`
   - Fetches the Animation Design Brief using this ID
   - Renders a `RemoteComponent` with the ADB as the `brief` prop

3. **RemoteComponent/useRemoteComponent**
   - Loads the component JS bundle using a script tag
   - Bundle URL is loaded via `/api/components/[componentId]`
   - Bundle registers itself as `window.__REMOTION_COMPONENT`
   - Props are passed to the loaded component

## API Routes

### `/api/components/[componentId]`
- **Purpose**: Serve the compiled JS bundle
- **Method**: GET
- **Returns**: 307 Temporary Redirect to the R2 URL
- **Error Handling**: Returns 404 if component not found, 503 if not ready

### `/api/components/[componentId]/metadata`
- **Purpose**: Provide component metadata
- **Method**: GET
- **Returns**: JSON with component details including `animationDesignBriefId`

### `/api/animation-design-briefs/[briefId]`
- **Purpose**: Retrieve the Animation Design Brief
- **Method**: GET
- **Returns**: JSON with the ADB data

## tRPC Endpoints

### `customComponent.getJobById`
- **Purpose**: Get detailed component job information
- **Input**: `{ jobId: string }`
- **Returns**: Complete job information including metadata
- **Security**: Verifies user has access to the project

## Component Data Flow

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Animation LLM   │────▶│ Component Code LLM  │────▶│  esbuild Worker  │
└──────────────────┘     └─────────────────────┘     └──────────────────┘
        │                         │                           │
        ▼                         ▼                           ▼
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│ animationDesign  │     │ customComponentJobs │     │    R2 Storage    │
│     Briefs       │     │   (tsxCode field)   │     │  (JS Bundles)    │
└──────────────────┘     └─────────────────────┘     └──────────────────┘
        │                         │                           │
        │                         │                           │
        ├─────────────────────────┼───────────────────────────┘
        │                         │
        ▼                         ▼
┌──────────────────┐     ┌─────────────────────┐
│ API: ADB Route   │     │  API: Component JS  │
└──────────────────┘     └─────────────────────┘
        │                         │
        ▼                         ▼
┌──────────────────────────────────────────────┐
│         CustomScene Component                │
├──────────────────────────────────────────────┤
│  1. Fetches metadata + ADB                   │
│  2. Passes ADB as 'brief' prop               │
│  3. Renders component via RemoteComponent    │
└──────────────────────────────────────────────┘
```

## Component Requirements

LLM-generated components are expected to:

1. Register themselves as `window.__REMOTION_COMPONENT`