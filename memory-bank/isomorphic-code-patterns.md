# Isomorphic Code Patterns

## What is Isomorphic Code?

Isomorphic (or universal) code refers to JavaScript/TypeScript that can run in both server (Node.js) and browser environments. Writing isomorphic code can be challenging because each environment has different capabilities and APIs.

## Common Challenges

1. **Node.js Built-in Modules**: Modules like `fs`, `path`, and `crypto` don't exist in browsers
2. **Browser APIs**: APIs like `window`, `document`, and `localStorage` don't exist in Node.js
3. **Environment-specific dependencies**: Some npm packages only work in one environment
4. **Context detection**: Code needs to detect which environment it's running in

## Recommended Patterns

### 1. Environment Detection

Always use a reliable method to detect the current environment:

```typescript
// Detect if code is running on server or browser
const isServer = typeof window === 'undefined';

if (isServer) {
  // Server-only code
} else {
  // Browser-only code
}
```

### 2. Conditional Imports

For environment-specific imports, use dynamic imports or top-level imports with conditional usage:

```typescript
// Top-level imports with conditional usage
import fs from 'fs'; // This is fine even in browser code if you never execute fs operations

// Only use fs in server environment
if (typeof window === 'undefined') {
  const content = fs.readFileSync('file.txt', 'utf8');
}
```

### 3. Feature Detection

For APIs that might exist in one environment but not the other:

```typescript
// Check if localStorage is available
const hasLocalStorage = typeof localStorage !== 'undefined';

// Use with guard clause
function saveData(key, value) {
  if (!hasLocalStorage) return false;
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}
```

### 4. Environment-Specific Implementations

Create different implementations for different environments but with a consistent API:

```typescript
// Abstract interface
interface StorageProvider {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

// Server implementation
class ServerStorage implements StorageProvider {
  private data: Record<string, string> = {};
  
  get(key: string): string | null {
    return this.data[key] || null;
  }
  
  set(key: string, value: string): void {
    this.data[key] = value;
  }
}

// Browser implementation
class BrowserStorage implements StorageProvider {
  get(key: string): string | null {
    return localStorage.getItem(key);
  }
  
  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
}

// Factory that returns the appropriate implementation
const createStorage = (): StorageProvider => {
  return typeof window === 'undefined' 
    ? new ServerStorage() 
    : new BrowserStorage();
}

// Usage
const storage = createStorage();
storage.set('key', 'value'); // Works in both environments
```

## Accessing Server-Side Resources from Client Components

One common challenge in Next.js applications is safely accessing server-side resources (like environment variables, database connections, etc.) from client components. Here are the recommended patterns:

### 1. Use tRPC for Server-Side Operations

The safest and most type-safe way to access server-side resources from client components is to create a tRPC procedure:

```typescript
// ✅ GOOD: Server-side API endpoint (src/server/api/routers/example.ts)
export const exampleRouter = createTRPCRouter({
  getServerData: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Safely access server-side resources here
      const apiKey = env.API_KEY; // Server-side env var
      const result = await someServerSideOperation(apiKey, input.id);
      return result;
    }),
});

// Client-side component (src/app/some-page.tsx)
"use client";
import { api } from "~/trpc/react";

export default function SomePage() {
  // Use the tRPC hook to access server data
  const { data } = api.example.getServerData.useQuery({ id: "123" });
  return <div>{data}</div>;
}
```

### 2. Server Functions in Next.js

For simpler operations, you can use Next.js server functions (in Server Components):

```typescript
// Server Component (src/app/server-component.tsx)
import { env } from "~/env";

// This function runs only on the server
async function getDataFromServer() {
  const apiKey = env.API_KEY; // Safe - server-side only
  // ... server-side logic
  return result;
}

export default async function ServerComponent() {
  const data = await getDataFromServer();
  return <div>{data}</div>;
}
```

### 3. Anti-Patterns to Avoid

```typescript
// ❌ BAD: Directly importing server-side services in client components
"use client";
import { someServerService } from "~/server/services/some-service"; // Error: Server code in client

// ❌ BAD: Accessing server environment variables in client code
"use client";
import { env } from "~/env"; // Error: Server-side env vars accessed on client

function ClientComponent() {
  const apiKey = env.API_KEY; // Will cause build error
  // ...
}
```

## Real-World Example: AI Title Generation

In our application, we needed to generate AI-powered titles using OpenAI, which requires an API key:

### Initial Problem:

```typescript
// ❌ BAD: Client component directly importing server service
"use client";
import { generateTitle } from "~/server/services/titleGenerator.service";

function ChatPanel() {
  const handleSubmit = async () => {
    // This will cause a build error - server code in client
    const title = await generateTitle({ prompt: message });
    // ...
  }
}
```

### Solution:

1. Created a tRPC procedure for title generation on the server:

```typescript
// Server-side router
export const projectRouter = createTRPCRouter({
  generateAITitle: protectedProcedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ input }) => {
      // Safely use server-side resources
      const result = await generateTitle({ prompt: input.prompt });
      return { title: result.title };
    }),
});
```

2. Updated client code to use the tRPC procedure:

```typescript
// Client component
"use client";
import { api } from "~/trpc/react";

function ChatPanel() {
  // Create a mutation hook
  const generateAITitleMutation = api.project.generateAITitle.useMutation();
  
  const handleSubmit = () => {
    // Use the mutation with callbacks
    generateAITitleMutation.mutate(
      { prompt: message },
      {
        onSuccess: (result) => {
          const generatedTitle = result.title;
          // Use the title...
        }
      }
    );
  }
}
```

This pattern ensures:
- Server-side environment variables stay on the server
- Type safety between client and server
- Clear separation of concerns
- Proper error handling

## Best Practices

1. **Avoid direct use of environment-specific APIs** without checking environment first
2. **Create abstractions** that work in both environments
3. **Use dependency injection** to pass environment-specific services
4. **Consider using polyfills** for missing functionality
5. **Write tests for both environments** to ensure code works everywhere

## Debugging Tips

1. If you get errors about missing APIs, check if you're using Node.js modules in browser code
2. Use webpack configurations to provide empty implementations for Node.js modules
3. For browser-only code, use dynamic imports to prevent Node.js from executing it
4. Use proper TypeScript types and guards to prevent runtime errors 