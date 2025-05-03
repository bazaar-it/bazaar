# OpenAI Function Calling for Custom Component Generation

## Overview

This document outlines the implementation of OpenAI function calling for the custom Remotion component generation feature in Sprint 5-6. This feature enables users to create custom visual effects through natural language prompts.

## Architecture

The custom component generation process follows these steps:

1. **User Request**: User sends a message through the chat interface requesting a custom component
2. **Request Detection**: The chat router detects component-related keywords in the message
3. **Component Generation**: The system uses OpenAI function calling to generate TSX code
4. **Job Creation**: A custom component job is created and saved to the database
5. **Compilation**: The background worker compiles the TSX code to JS
6. **Storage**: The compiled component is uploaded to Cloudflare R2
7. **Loading**: The component is dynamically loaded using the `useRemoteComponent` hook

## Implementation Details

### 1. OpenAI Function Definition

We defined a function schema for OpenAI to understand how to generate components:

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
        description: "The full TSX code for the Remotion component. Must be valid TypeScript React code that can be compiled.",
      },
    },
  },
};
```

### 2. Code Generation Worker

We created a code generation function that:

- Uses Remotion's official prompt as the system prompt
- Calls the OpenAI API with function calling enabled
- Sanitizes and validates the generated code
- Returns the effect description and TSX code

### 3. Chat Router Integration

We updated the chat router to:

- Detect component-related keywords in messages
- Call the component generation function
- Create a component job in the database
- Return appropriate responses to the frontend

### 4. UI Updates

We updated the chat interface to:

- Handle both regular patch responses and component generation responses
- Display appropriate messages to users about component status
- Support the component insertion workflow

## Testing

To test the component generation:

1. Send a message like "Create a custom component that shows a bouncing text animation with a gradient background"
2. The system will detect this as a component request
3. A component job will be created and processed
4. The component will be available in the custom component panel once compiled

## Next Steps

1. Update the chat UI to display component status during generation
2. Add error handling for failed component generation
3. Improve the system prompt for better component generation quality
