# Feature 023: GitHub Integration

**Priority**: LOW  
**Complexity**: MEDIUM  
**Effort**: 3 days  
**Dependencies**: Auth system, Git operations, External API integration

## Overview

Implement GitHub integration to allow users to sync their video code to GitHub repositories, enabling version control, collaboration, and backup of their Remotion video projects. This feature bridges the gap between visual video creation and traditional development workflows.

## Problem Statement

### Current Issues
- No version control for video projects
- No way to collaborate on video code
- Cannot track changes or revert to previous versions
- No backup/sync mechanism for projects
- Missing development workflow integration
- Cannot share projects with developers

### User Needs
- Backup video projects to GitHub
- Version control for video code changes
- Collaborate with team members on videos
- Integrate with existing development workflows
- Track history of video evolution
- Share projects publicly or privately

## Technical Specification

### Architecture Overview

#### 1. GitHub OAuth Integration
```typescript
// Auth configuration for GitHub
const githubProvider = {
  id: 'github',
  name: 'GitHub',
  type: 'oauth',
  authorization: {
    url: 'https://github.com/login/oauth/authorize',
    params: {
      scope: 'repo user:email'
    }
  },
  token: 'https://github.com/login/oauth/access_token',
  userinfo: 'https://api.github.com/user'
};

// Add to NextAuth config
export const authOptions: NextAuthOptions = {
  providers: [
    // ... existing providers
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'repo user:email'
        }
      }
    })
  ]
};
```

#### 2. Database Schema
```typescript
// Add to database schema
export const githubIntegrations = pgTable('github_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  projectId: uuid('project_id').references(() => projects.id),
  
  // GitHub details
  githubUserId: varchar('github_user_id', { length: 255 }).notNull(),
  repositoryName: varchar('repository_name', { length: 255 }).notNull(),
  repositoryUrl: varchar('repository_url', { length: 500 }).notNull(),
  branch: varchar('branch', { length: 255 }).default('main'),
  
  // Sync status
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: varchar('sync_status', { length: 50 }).default('pending'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

#### 3. GitHub Service
```typescript
// Service for GitHub operations
class GitHubService {
  private octokit: Octokit;
  
  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken
    });
  }
  
  async createRepository(name: string, description: string, isPrivate = true) {
    const { data } = await this.octokit.rest.repos.create({
      name,
      description,
      private: isPrivate,
      auto_init: true
    });
    return data;
  }
  
  async syncProject(project: Project, repoName: string) {
    const files = await this.generateProjectFiles(project);
    
    // Create or update files
    for (const [path, content] of Object.entries(files)) {
      await this.createOrUpdateFile(repoName, path, content);
    }
    
    return { success: true, filesUpdated: Object.keys(files).length };
  }
  
  private async generateProjectFiles(project: Project): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    // README with project info
    files['README.md'] = this.generateReadme(project);
    
    // Package.json for Remotion project
    files['package.json'] = this.generatePackageJson(project);
    
    // Remotion config
    files['remotion.config.ts'] = this.generateRemotionConfig(project);
    
    // Individual scene files
    project.scenes.forEach((scene, index) => {
      files[`src/scenes/Scene${index + 1}.tsx`] = scene.code;
    });
    
    // Root composition
    files['src/Root.tsx'] = this.generateRootComposition(project);
    
    return files;
  }
}
```

### Frontend Implementation

#### 1. GitHub Settings UI
```typescript
// GitHub integration settings component
const GitHubIntegrationSettings = ({ project }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  
  const connectGitHub = async () => {
    // OAuth flow
    await signIn('github', { 
      callbackUrl: `/projects/${project.id}/settings?tab=github` 
    });
  };
  
  const syncToGitHub = async () => {
    const result = await syncProjectToGitHub.mutate({
      projectId: project.id,
      repositoryName: selectedRepo
    });
    
    if (result.success) {
      toast.success('Project synced to GitHub successfully!');
    }
  };
  
  return (
    <div className="github-integration">
      {!isConnected ? (
        <div className="connect-github">
          <h3>Connect to GitHub</h3>
          <p>Sync your video projects to GitHub for version control and collaboration.</p>
          <Button onClick={connectGitHub}>
            <GitHubIcon className="mr-2" />
            Connect GitHub Account
          </Button>
        </div>
      ) : (
        <div className="github-connected">
          <h3>GitHub Integration</h3>
          <div className="repository-selection">
            <Label>Select Repository</Label>
            <Select value={selectedRepo} onValueChange={setSelectedRepo}>
              <SelectTrigger>
                <SelectValue placeholder="Choose repository" />
              </SelectTrigger>
              <SelectContent>
                {repositories.map(repo => (
                  <SelectItem key={repo.name} value={repo.name}>
                    {repo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="sync-actions">
            <Button onClick={syncToGitHub}>
              Sync to GitHub
            </Button>
            <Button variant="outline" onClick={createNewRepo}>
              Create New Repository
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
```

#### 2. Sync Status Display
```typescript
// Show sync status in project header
const ProjectSyncStatus = ({ project }) => {
  const { data: syncStatus } = api.github.getSyncStatus.useQuery(project.id);
  
  if (!syncStatus?.isConnected) return null;
  
  return (
    <div className="sync-status">
      <GitHubIcon className="w-4 h-4" />
      <span className="text-sm">
        Last synced: {formatDistanceToNow(syncStatus.lastSyncAt)} ago
      </span>
      
      {syncStatus.status === 'syncing' && (
        <Spinner className="w-4 h-4" />
      )}
      
      {syncStatus.hasUncommittedChanges && (
        <Badge variant="warning">Unsaved changes</Badge>
      )}
    </div>
  );
};
```

#### 3. Commit History View
```typescript
// View commit history for project
const CommitHistory = ({ project }) => {
  const { data: commits } = api.github.getCommitHistory.useQuery(project.id);
  
  return (
    <div className="commit-history">
      <h3>Version History</h3>
      {commits?.map(commit => (
        <div key={commit.sha} className="commit-item">
          <div className="commit-header">
            <strong>{commit.message}</strong>
            <time>{formatDistance(commit.date, new Date())} ago</time>
          </div>
          <div className="commit-details">
            <span className="commit-author">{commit.author}</span>
            <span className="commit-sha">{commit.sha.slice(0, 7)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => revertToCommit(commit.sha)}
          >
            Revert to this version
          </Button>
        </div>
      ))}
    </div>
  );
};
```

### Backend API Implementation

#### 1. tRPC Procedures
```typescript
// GitHub-related API procedures
export const githubRouter = createTRPCRouter({
  connectRepository: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      repositoryName: z.string(),
      createNew: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const githubToken = await getGitHubToken(user.id);
      
      const githubService = new GitHubService(githubToken);
      
      if (input.createNew) {
        const repo = await githubService.createRepository(
          input.repositoryName,
          `Video project: ${input.projectId}`
        );
      }
      
      // Save integration
      await ctx.db.insert(githubIntegrations).values({
        userId: user.id,
        projectId: input.projectId,
        repositoryName: input.repositoryName,
        repositoryUrl: repo.html_url
      });
      
      return { success: true };
    }),
  
  syncProject: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      commitMessage: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectWithScenes(input.projectId);
      const integration = await getGitHubIntegration(input.projectId);
      const githubToken = await getGitHubToken(ctx.session.user.id);
      
      const githubService = new GitHubService(githubToken);
      
      const result = await githubService.syncProject(
        project,
        integration.repositoryName
      );
      
      // Update sync status
      await ctx.db.update(githubIntegrations)
        .set({
          lastSyncAt: new Date(),
          syncStatus: 'completed'
        })
        .where(eq(githubIntegrations.projectId, input.projectId));
      
      return result;
    })
});
```

#### 2. Auto-sync on Changes
```typescript
// Auto-sync when scenes are updated
export const useAutoSync = (projectId: string) => {
  const [pendingChanges, setPendingChanges] = useState(false);
  const syncMutation = api.github.syncProject.useMutation();
  
  // Watch for scene changes
  const scenes = useVideoState(state => state.projects[projectId]?.scenes);
  
  useEffect(() => {
    if (scenes) {
      setPendingChanges(true);
      
      // Debounced auto-sync after 30 seconds of inactivity
      const timer = setTimeout(() => {
        syncMutation.mutate({
          projectId,
          commitMessage: `Auto-sync: Updated scenes (${new Date().toISOString()})`
        });
        setPendingChanges(false);
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, [scenes, projectId]);
  
  return { pendingChanges, syncNow: () => syncMutation.mutate({ projectId }) };
};
```

## Implementation Plan

### Phase 1: OAuth & Basic Integration (Day 1)
1. Set up GitHub OAuth provider
2. Create database schema for integrations
3. Implement basic GitHub service
4. Add connection UI to project settings

### Phase 2: File Generation & Sync (Day 2)
1. Implement project-to-files conversion
2. Create GitHub sync functionality
3. Add sync status tracking
4. Implement manual sync button

### Phase 3: Advanced Features (Day 3)
1. Add commit history viewing
2. Implement auto-sync on changes
3. Add conflict resolution handling
4. Create revert functionality
5. Polish UI and error handling

## Success Metrics

- **Integration Success**: 95% of OAuth connections succeed
- **Sync Reliability**: 99% of sync operations complete successfully
- **Performance**: Sync completes in < 10 seconds for typical projects
- **User Adoption**: 20% of active users connect GitHub within 30 days

## File Structure Generated

```
remotion-project/
├── README.md                    # Project description and setup
├── package.json                # Remotion dependencies
├── remotion.config.ts          # Remotion configuration
├── src/
│   ├── Root.tsx               # Main composition
│   ├── scenes/
│   │   ├── Scene1.tsx         # Individual scenes
│   │   ├── Scene2.tsx
│   │   └── ...
│   └── types/
│       └── index.ts           # TypeScript types
├── .gitignore                 # Git ignore rules
└── public/                    # Static assets
    └── assets/               # Project assets
```

## Edge Cases & Considerations

1. **Repository Conflicts**
   - Handle merge conflicts gracefully
   - Provide conflict resolution UI
   - Allow manual resolution

2. **Large Projects**
   - Optimize file generation for projects with many scenes
   - Implement incremental sync
   - Handle GitHub file size limits

3. **Access Control**
   - Respect GitHub repository permissions
   - Handle revoked access tokens
   - Provide clear error messages

4. **Rate Limiting**
   - Respect GitHub API rate limits
   - Implement exponential backoff
   - Queue sync operations if needed

## Security Considerations

1. **Token Storage**
   - Encrypt GitHub tokens in database
   - Implement token refresh logic
   - Handle token expiration gracefully

2. **Repository Access**
   - Only sync to repositories user owns or has write access
   - Validate repository permissions before sync
   - Prevent unauthorized access

3. **Code Generation**
   - Sanitize generated code
   - Prevent code injection in commits
   - Validate file paths and names

## Related Features

- Feature 16: User Database Management (project organization)
- Feature 17: Community Projects (public sharing)
- Feature 8: Accept Payments (premium feature)

## Future Enhancements

1. **Advanced Git Operations**
   - Branch management
   - Pull request creation
   - Code review integration
   - Git hooks for validation

2. **Collaboration Features**
   - Real-time co-editing
   - Conflict resolution UI
   - Team project management
   - Role-based permissions

3. **CI/CD Integration**
   - GitHub Actions for video rendering
   - Automated deployment
   - Quality checks and testing
   - Performance monitoring

4. **Multi-Platform Support**
   - GitLab integration
   - Bitbucket support
   - Self-hosted Git servers
   - Azure DevOps integration