# Custom Component System Documentation

## Overview

The Custom Component System enables users to create dynamic Remotion components through natural language prompts. These components are generated, compiled, and stored in Cloudflare R2, then dynamically loaded into the Remotion player at runtime.

## Architecture

![Custom Component System Architecture](https://via.placeholder.com/800x400?text=Custom+Component+System+Architecture)

### Components

1. **Database Layer**
   - `customComponentJobs` table tracks component generation jobs
   - Relationships with the `projects` table for authorization

2. **API Layer**
   - `customComponentRouter` handles CRUD operations for components
   - `chatRouter` detects component generation requests and triggers the process

3. **Component Generation**
   - OpenAI function calling generates TSX code from prompts
   - Remotion-specific system prompt guides generation quality

4. **Build Pipeline**
   - `buildCustomComponent.ts` worker compiles TSX to JS
   - Code sanitization prevents unsafe imports and operations
   - Uploads to R2 using AWS S3-compatible SDK

5. **Runtime Loading**
   - `useRemoteComponent` hook dynamically loads components from R2
   - `CustomScene` integrates remote components into the Remotion timeline

## Flow

1. **User Request**: User submits a prompt like "create a custom component that shows a bouncing text"
2. **Request Detection**: Chat router detects component-related request
3. **Code Generation**: OpenAI generates TSX code using function calling
4. **Database Storage**: Component job is created in the database
5. **Background Processing**: Cron job processes pending jobs
6. **Compilation**: esbuild compiles TSX to JS
7. **Storage**: Compiled JS is uploaded to R2
8. **Status Update**: Job status is updated in the database
9. **Component Insertion**: User can insert the component into their timeline
10. **Dynamic Loading**: Component is loaded at runtime in the Remotion player

## Database Schema

```typescript
export const customComponentJobs = pgTable("custom_component_job", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  effect: text("effect").notNull(),
  tsxCode: text("tsx_code").notNull(),
  jsCode: text("js_code"),
  publicUrl: text("public_url"),
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] })
    .notNull()
    .default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `customComponent.create` | Creates a new component job |
| `customComponent.getByProject` | Retrieves all components for a project |
| `customComponent.getById` | Gets a specific component job |
| `customComponent.getStatus` | Checks the status of a component job |
| `/api/cron/process-component-jobs` | Processes pending component jobs |

## Component Generation

The system uses OpenAI's function calling to generate components. Here's the function definition:

```typescript
export const generateCustomComponentFunctionDef = {
  name: "generateCustomComponent",
  description: "Generate a custom Remotion component based on the user's description",
  parameters: {
    type: "object",
    required: ["effect", "tsxCode"],
    properties: {
      effect: {
        type: "string",
        description: "A short description of the visual effect to be created",
      },
      tsxCode: {
        type: "string",
        description: "The full TSX code for the Remotion component...",
      },
    },
  },
};
```

## Component Loading

Components are dynamically loaded using React's lazy loading and a custom hook:

```typescript
export function useRemoteComponent(componentId: string) {
  const [component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadComponent = async () => {
      try {
        // Fetch component job from database
        const { data } = await api.customComponent.getById.query({ id: componentId });
        
        if (!data || !data.publicUrl) {
          throw new Error('Component not found or not ready');
        }
        
        // Dynamically import the component
        const RemoteComponent = React.lazy(() => import(/* @vite-ignore */ data.publicUrl));
        
        if (isMounted) {
          setComponent(RemoteComponent);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load component'));
          setLoading(false);
        }
      }
    };
    
    void loadComponent();
    
    return () => {
      isMounted = false;
    };
  }, [componentId]);

  return { component, loading, error };
}
```

## UI Components

### CustomComponentStatus

Displays the status of a component job with proper loading states and error handling.

### InsertCustomComponentButton

Adds a custom component to the timeline by creating a patch operation.

## Best Practices

1. **Error Handling**
   - Always handle network errors when loading remote components
   - Provide meaningful error messages to users
   - Implement retry mechanisms for failed jobs

2. **Security**
   - Sanitize generated code to prevent unsafe imports
   - Validate TSX code before compilation
   - Use CRON_SECRET to protect the cron job endpoint

3. **Performance**
   - Use React.lazy for code splitting
   - Implement caching strategies for frequently used components
   - Keep component sizes small for faster loading

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Component fails to generate | Check OpenAI logs for errors in the function calling |
| Component fails to compile | Examine the TSX code for syntax errors or unsupported imports |
| Component doesn't appear in timeline | Verify the component URL is accessible and the R2 bucket is properly configured |
| Slow component loading | Check network connection and consider caching strategies |

## Environment Configuration

Ensure these environment variables are set up correctly:

```
# R2 Storage
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=[your-access-key]
R2_SECRET_ACCESS_KEY=[your-secret-key]
R2_BUCKET_NAME=bazaar-vid-components
R2_PUBLIC_URL=https://[bucket-name].[account-id].r2.dev

# Cron Job
CRON_SECRET=[your-secret-key]
```

## Future Improvements

1. **Component Versioning**
   - Track versions of components
   - Allow reverting to previous versions

2. **Component Library**
   - Create a shared library of pre-built components
   - Allow users to publish their components

3. **Enhanced Prompts**
   - Improve prompt engineering for better component generation
   - Implement prompt templates for common effects

4. **Testing Framework**
   - Add automated tests for component generation
   - Implement visual regression testing

5. **Performance Optimizations**
   - Optimize component loading with preloading strategies
   - Implement CDN caching for frequently used components
