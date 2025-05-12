# Next.js Redirect Function Best Practices

## The NEXT_REDIRECT Error

In Next.js, the `redirect()` function works by throwing a special error under the hood called `NEXT_REDIRECT`. This error is caught by Next.js's internal error handling mechanism to perform the actual redirection.

### Key Points

- The `redirect()` function from "next/navigation" throws a `NEXT_REDIRECT` error that Next.js handles internally
- This function should not be used inside a try/catch block, as the error will be caught by your code instead of Next.js
- When used in a Server Component, it stops execution immediately, similar to the `notFound()` function

## Best Practices

### ✅ Correct Usage

```tsx
// Good - redirect is outside of try/catch
async function createEntity() {
  let entity;
  
  try {
    // Database operations or other code that might throw errors
    entity = await db.insert(entities).values(values).returning();
  } catch (error) {
    console.error(error);
    // Handle the error
  }
  
  // Redirect is outside the try/catch block
  if (entity?.id) {
    redirect(`/entities/${entity.id}`);
  } else {
    redirect('/entities');
  }
}
```

### ❌ Incorrect Usage

```tsx
// Bad - redirect is inside try/catch
async function createEntity() {
  try {
    // Database operations
    const entity = await db.insert(entities).values(values).returning();
    
    // This redirect error will be caught by the catch block below!
    redirect(`/entities/${entity.id}`);
  } catch (error) {
    // The NEXT_REDIRECT error will be caught here
    console.error(error); // Will show a NEXT_REDIRECT error
    
    // This code will run instead of the redirect
  }
}
```

## Handling Server Actions

When using Server Actions with `redirect()`, they should be handled with care:

### Client Component

```tsx
'use client'

// In a client component with useTransition:
import { useTransition } from 'react';
import { myServerAction } from './actions';

export function MyForm() {
  const [isPending, startTransition] = useTransition();
  
  const handleSubmit = () => {
    // Option 1: Return the server action
    startTransition(() => {
      return myServerAction(values); // This works with redirect
    });
    
    // Option 2: Use async/await (better for error handling)
    startTransition(async () => {
      await myServerAction(values); // This also works with redirect
    });
    
    // Bad: This doesn't await or return, so redirect won't work
    // startTransition(() => {
    //   myServerAction(values);
    // });
  };
  
  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Server Action

```tsx
'use server'

// In a server action:
export async function myServerAction(values) {
  let entity;
  
  try {
    // Database operations
    entity = await createEntity(values);
  } catch (error) {
    // Handle error but don't redirect here
    return { error: "Failed to create entity" };
  }
  
  // Place redirects outside try/catch
  if (entity) {
    redirect(`/entities/${entity.id}`);
  }
  
  return { success: true };
}
```

## Technical Details

The `redirect()` function is typed as returning `never` in TypeScript, indicating that execution flow doesn't continue past the `redirect()` call. This is because it throws an error which halts execution.

```typescript
function redirect(url: string): never;
```

Understanding this behavior is important for properly structuring your code to handle errors appropriately while still allowing redirects to function correctly.

## References

- [Next.js Documentation on redirect](https://nextjs.org/docs/app/api-reference/functions/redirect)
- [GitHub Issue: NEXT_REDIRECT error with server actions](https://github.com/vercel/next.js/issues/49298) 