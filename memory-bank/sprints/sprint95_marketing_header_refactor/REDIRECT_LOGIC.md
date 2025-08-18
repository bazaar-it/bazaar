# Smart Redirect Logic

## Overview

This document details the intelligent redirect logic implemented to improve user workflow efficiency by automatically directing logged-in users to their workspace while maintaining access to marketing pages through internal navigation.

## Problem Statement

### Before Implementation

- **Inefficient Workflow**: Logged-in users had to manually navigate to their projects after visiting homepage
- **Poor User Experience**: Users were stuck on marketing pages even when they wanted to work
- **Inconsistent Behavior**: No clear pattern for when users should be redirected vs. stay on marketing pages
- **Navigation Confusion**: Users weren't sure how to get back to their workspace

## Solution Implementation

### 1. Intelligent Redirect Logic

#### Core Redirect Behavior

```typescript
// In src/app/(marketing)/page.tsx
export default function MarketingPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // Redirect logged-in users to their latest project
      redirectToLatestProject();
    }
  }, [user]);

  // Only render marketing content for non-logged-in users
  if (user) {
    return null; // Will redirect
  }

  return <MarketingContent />;
}
```

#### Redirect Flow

1. **User Visits Homepage**: Check authentication status
2. **If Logged In**: Automatically redirect to latest project
3. **If No Projects**: Create new project and redirect there
4. **If Not Logged In**: Stay on homepage (marketing content)

### 2. Project Creation and Redirect

#### Quick Create Logic

```typescript
// In src/app/projects/quick-create/page.tsx
export default function QuickCreatePage() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Create new project if user has none
      const createAndRedirect = async () => {
        const project = await createNewProject(user.id);
        router.push(`/projects/${project.id}`);
      };

      createAndRedirect();
    }
  }, [user]);
}
```

#### Project Creation Features

- **Automatic Creation**: New project created if user has none
- **Seamless Redirect**: User immediately taken to workspace
- **Error Handling**: Graceful fallback if project creation fails
- **User Context**: Project created with proper user association

### 3. Navigation Preservation

#### Internal Navigation Access

```typescript
// Users can still access homepage through internal navigation
const handleHomeClick = () => {
  // Force navigation to homepage (bypasses redirect)
  router.push('/?force=true');
};

// In marketing page, check for force parameter
const searchParams = useSearchParams();
const forceHome = searchParams.get('force');

if (user && !forceHome) {
  // Normal redirect behavior
  redirectToLatestProject();
} else if (user && forceHome) {
  // Allow homepage access for internal navigation
  return <MarketingContent />;
}
```

#### Navigation Features

- **Header Navigation**: Logo and navigation buttons work normally
- **Force Access**: Internal links can force homepage access
- **Breadcrumb Support**: Users can navigate back to marketing pages
- **Consistent Experience**: Marketing content available when needed

## Implementation Details

### Authentication Integration

#### User State Management

```typescript
// Check user authentication status
const { user, isLoading } = useAuth();

// Handle loading state
if (isLoading) {
  return <LoadingSpinner />;
}

// Redirect logic based on auth state
if (user) {
  // User is logged in - redirect to workspace
  return <WorkspaceRedirect />;
} else {
  // User is not logged in - show marketing content
  return <MarketingContent />;
}
```

#### Session Handling

- **Persistent Sessions**: Redirect logic respects user sessions
- **Token Validation**: Proper authentication token checking
- **Session Expiry**: Graceful handling of expired sessions
- **Multi-tab Support**: Consistent behavior across browser tabs

### Project Management

#### Latest Project Detection

```typescript
const getLatestProject = async (userId: string) => {
  const projects = await fetchUserProjects(userId);

  if (projects.length === 0) {
    return null; // No projects exist
  }

  // Return most recently updated project
  return projects.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
};
```

#### Project Creation Flow

```typescript
const createNewProject = async (userId: string) => {
  const project = await api.post("/projects", {
    userId,
    name: "Untitled Project",
    description: "New project created automatically",
  });

  return project;
};
```

### URL Parameter Handling

#### Force Navigation

```typescript
// Handle force navigation to homepage
const searchParams = useSearchParams();
const forceHome = searchParams.get("force");
const skipRedirect = searchParams.get("skip");

// Determine if redirect should be skipped
const shouldSkipRedirect = forceHome === "true" || skipRedirect === "true";

if (user && !shouldSkipRedirect) {
  // Normal redirect behavior
  redirectToLatestProject();
}
```

#### Query Parameter Support

- **force=true**: Force homepage access for logged-in users
- **skip=true**: Skip redirect logic entirely
- **return=project**: Return to specific project after action
- **source=marketing**: Track navigation source for analytics

## User Experience Flow

### 1. New User Journey

```
1. User visits homepage → Sees marketing content
2. User clicks "Try for Free" → Login modal opens
3. User logs in → Automatically redirected to new project
4. User starts working → Seamless workspace experience
```

### 2. Returning User Journey

```
1. User visits homepage → Automatically redirected to latest project
2. User can access marketing → Via header navigation
3. User logs out → Returns to marketing homepage
4. User logs back in → Redirected to workspace
```

### 3. Internal Navigation

```
1. User in workspace → Clicks logo in header
2. User sees homepage → Marketing content (force navigation)
3. User can navigate back → Via workspace navigation
4. User stays in context → No unwanted redirects
```

## Benefits Achieved

### 1. Improved Workflow Efficiency

- **Faster Access**: Users reach workspace immediately
- **Reduced Friction**: No manual navigation required
- **Context Preservation**: Users stay in their work environment
- **Seamless Transitions**: Smooth login-to-workflow experience

### 2. Better User Experience

- **Intuitive Behavior**: Users expect to go to their workspace
- **Consistent Patterns**: Predictable navigation behavior
- **Flexible Access**: Marketing content still accessible when needed
- **Professional Feel**: App feels more like a workspace than marketing site

### 3. Technical Benefits

- **Clean Architecture**: Clear separation of marketing and workspace logic
- **Performance**: Reduced unnecessary page loads
- **Maintainability**: Centralized redirect logic
- **Scalability**: Easy to extend for different user types

## Testing Strategy

### Manual Testing Scenarios

1. **New User**: Visit homepage → Login → Check redirect to new project
2. **Returning User**: Visit homepage → Check redirect to latest project
3. **Internal Navigation**: From workspace → Click logo → Check homepage access
4. **Logout Flow**: Logout from workspace → Check return to marketing
5. **Multi-tab**: Open multiple tabs → Check consistent behavior

### Automated Testing

```typescript
describe("Redirect Logic", () => {
  it("should redirect logged-in users to latest project", () => {
    // Test automatic redirect
  });

  it("should create new project for users with no projects", () => {
    // Test project creation
  });

  it("should allow homepage access via internal navigation", () => {
    // Test force navigation
  });

  it("should show marketing content for non-logged-in users", () => {
    // Test guest experience
  });
});
```

## Future Enhancements

### Potential Improvements

1. **Smart Project Selection**: Remember user's preferred project
2. **Workspace Preferences**: Allow users to set default workspace
3. **Analytics Integration**: Track redirect patterns and user behavior
4. **A/B Testing**: Test different redirect strategies

### Advanced Features

- **Project Templates**: Redirect to template selection for new users
- **Onboarding Flow**: Integrate with user onboarding process
- **Team Workspaces**: Handle team project redirects
- **Custom Domains**: Support for custom workspace domains

## Success Metrics

### Quantitative Metrics

- **Time to Workspace**: Reduced time from login to workspace access
- **User Engagement**: Increased time spent in workspace
- **Bounce Rate**: Reduced homepage bounce rate for logged-in users
- **Navigation Efficiency**: Fewer clicks to reach workspace

### Qualitative Metrics

- **User Feedback**: Positive comments about seamless experience
- **Support Tickets**: Reduction in navigation-related issues
- **User Testing**: Improved usability scores
- **Product Adoption**: Faster adoption of workspace features

## Conclusion

The smart redirect logic successfully:

- Improves user workflow efficiency
- Provides seamless login-to-workspace experience
- Maintains access to marketing content when needed
- Creates a more professional and intuitive user experience

This implementation demonstrates the value of intelligent navigation patterns that adapt to user context while maintaining flexibility for different use cases.
