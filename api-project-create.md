# Project Creation API (`project.create`)

Creates a new video project for the authenticated user. Optionally, an initial message (prompt) can be included as the first chat message for the project.

**Route:** `/api/trpc/project.create`

## Input
```ts
{
  initialMessage?: string; // Optional. The first message from the user (prompt for the project)
}
```

- If `initialMessage` is provided and non-empty, it will be saved as the first message in the project's chat history (role: 'user').
- If not provided, the project is created without any messages.

## Output
```ts
{
  projectId: string; // The UUID of the created project
}
```

## Example Usage (client-side)
```ts
const project = await api.project.create.mutateAsync({
  initialMessage: "A documentary about penguins in Antarctica."
});
// Redirect:
router.push(`/projects/${project.projectId}/edit`);
```

## Notes
- The project title is auto-generated ("Untitled Video", incremented if needed).
- The user must be authenticated to use this endpoint.
- In the future, this endpoint can be extended to accept initial uploads (images, etc.) as part of the creation process.
