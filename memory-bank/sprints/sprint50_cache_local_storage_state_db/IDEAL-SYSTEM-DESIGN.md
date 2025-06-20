# The Ideal System Design

## Vision: Simple, Predictable, Reliable

If we were building this from scratch with no legacy constraints, here's how the perfect system would work.

## Core Principles

1. **Database is Truth**: Server data always wins
2. **State is Cache**: Client state is just a performance optimization
3. **One-Way Flow**: Data flows in one direction only
4. **No Defensive Code**: Trust the system, don't second-guess
5. **Explicit Over Implicit**: Clear intentions in code

## Architecture

### 1. Data Flow

```
Database → API → Page → Store → Components
    ↑                      ↓
    └──────── Actions ←────┘
```

### 2. State Structure

```typescript
// Super simple store
interface VideoStore {
  // Current data
  projects: Record<string, Project>;
  
  // Actions
  loadProject: (projectId: string) => Promise<void>;
  updateScene: (projectId: string, sceneId: string, data: any) => Promise<void>;
  generateScene: (projectId: string, prompt: string) => Promise<void>;
}

interface Project {
  id: string;
  scenes: Scene[];
  messages: Message[];
  lastUpdated: Date;
}
```

### 3. Implementation

#### The Store (videoStore.ts)
```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface VideoStore {
  projects: Record<string, Project>;
  
  loadProject: async (projectId: string) => {
    // Always load fresh from DB
    const data = await api.project.get(projectId);
    
    set(state => ({
      projects: {
        ...state.projects,
        [projectId]: data
      }
    }));
  },
  
  generateScene: async (projectId: string, prompt: string) => {
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempScene = { id: tempId, status: 'generating' };
    
    set(state => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          scenes: [...state.projects[projectId].scenes, tempScene]
        }
      }
    }));
    
    try {
      // Generate scene
      const scene = await api.scene.generate({ projectId, prompt });
      
      // Replace temp with real
      set(state => ({
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            scenes: state.projects[projectId].scenes.map(s => 
              s.id === tempId ? scene : s
            )
          }
        }
      }));
    } catch (error) {
      // Remove temp on error
      set(state => ({
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            scenes: state.projects[projectId].scenes.filter(s => 
              s.id !== tempId
            )
          }
        }
      }));
      throw error;
    }
  }
}

export const useVideoStore = create<VideoStore>()(
  subscribeWithSelector((set, get) => ({
    projects: {},
    
    loadProject: async (projectId) => {
      // Implementation above
    },
    
    generateScene: async (projectId, prompt) => {
      // Implementation above
    }
  }))
);
```

#### The Page (generate/page.tsx)
```typescript
export default async function GeneratePage({ params }: Props) {
  const projectId = params.id;
  
  // Load data server-side
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { scenes: true, messages: true }
  });
  
  if (!project) notFound();
  
  // Pass to client
  return <GenerateWorkspace project={project} />;
}
```

#### The Root Component (GenerateWorkspace.tsx)
```typescript
export default function GenerateWorkspace({ project }: Props) {
  const loadProject = useVideoStore(state => state.loadProject);
  
  // Initialize once
  useEffect(() => {
    // Set initial data
    useVideoStore.setState({
      projects: {
        [project.id]: project
      }
    });
    
    // Refresh periodically if needed
    const interval = setInterval(() => {
      loadProject(project.id);
    }, 30000); // Every 30s
    
    return () => clearInterval(interval);
  }, [project.id]);
  
  return <WorkspaceContent projectId={project.id} />;
}
```

#### Child Components
```typescript
// Super simple - just use the store
export function ChatPanel({ projectId }: Props) {
  const project = useVideoStore(state => state.projects[projectId]);
  const generateScene = useVideoStore(state => state.generateScene);
  
  if (!project) return null;
  
  const handleSubmit = async (prompt: string) => {
    await generateScene(projectId, prompt);
  };
  
  return (
    <div>
      {project.messages.map(msg => (
        <Message key={msg.id} {...msg} />
      ))}
      <ChatInput onSubmit={handleSubmit} />
    </div>
  );
}
```

### 4. Key Differences from Current System

#### What We Remove:
- Multiple initialization points
- Defensive "exists" checks  
- Complex state merging
- Competing update sources
- Manual refresh logic

#### What We Add:
- Single initialization
- Optimistic updates
- Automatic retries
- Clear error boundaries
- Simple subscriptions

### 5. Navigation Handling

```typescript
// Simple: just clear when leaving
export function GenerateWorkspace({ project }: Props) {
  useEffect(() => {
    return () => {
      // Clear this project when unmounting
      useVideoStore.setState(state => {
        const { [project.id]: _, ...rest } = state.projects;
        return { projects: rest };
      });
    };
  }, [project.id]);
}
```

### 6. Real-time Updates (Future)

```typescript
// Add WebSocket support
useEffect(() => {
  const ws = new WebSocket(`/api/ws?project=${projectId}`);
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    
    if (update.type === 'scene:updated') {
      // Merge update into store
      updateScene(projectId, update.sceneId, update.data);
    }
  };
  
  return () => ws.close();
}, [projectId]);
```

## Benefits of This Design

1. **Predictable**: Data always flows one way
2. **Simple**: No complex initialization logic
3. **Reliable**: Database is always truth
4. **Fast**: Optimistic updates for good UX
5. **Scalable**: Easy to add features
6. **Debuggable**: Clear data flow

## Migration Path

### Phase 1: Simplify Current System (Option 1)
- Remove defensive checks
- Fix immediate issues

### Phase 2: Clean Architecture (Option 2)  
- Single initialization point
- Add persistence
- Remove competing updates

### Phase 3: Ideal System (This Design)
- Full rewrite of state management
- Optimistic updates
- Real-time sync
- Perfect simplicity

## The Dream

Imagine debugging this system:
- See a bug? Check one place (the store)
- State wrong? It matches the database
- Update fails? Clear error handling
- Need to add feature? Clear extension points

This is what we should aim for - a system so simple that bugs have nowhere to hide.