# Title Generator Service

## Overview
The Title Generator Service provides AI-powered project title generation based on user prompts. It uses OpenAI's function calling capability to generate concise, contextually relevant titles for video projects.

## Technical Details

### Service Location
`src/server/services/titleGenerator.service.ts`

### Dependencies
- OpenAI SDK
- Winston logger (via `~/lib/logger`)

### API

#### `generateTitle(params: TitleGenerationParams): Promise<TitleGenerationResponse>`

Generates a project title using LLM capabilities.

**Parameters**:
```typescript
interface TitleGenerationParams {
  prompt: string;       // The user's message/prompt to generate a title from
  contextId?: string;   // Optional identifier for logging (e.g., projectId)
}
```

**Returns**:
```typescript
interface TitleGenerationResponse {
  title: string;        // The generated title
  reasoning?: string;   // Optional explanation of why this title was chosen
}
```

**Error Handling**:
- Returns a fallback title of "New Video Project" for any errors
- Logs detailed error information with timestamps

## Implementation Notes

### OpenAI Function Calling
The service uses OpenAI's function calling to get structured responses with the following parameters:
- Function name: `generate_video_title`
- Required parameters: `title` (string)
- Optional parameters: `reasoning` (string)

### System Prompt
The LLM is instructed to generate concise, descriptive titles (2-6 words) that capture the essence of the video project while avoiding generic terms like "Video" or "Project" unless they're essential.

### Model Selection
Uses the `o4-mini` model for efficient generation with low latency.

## Usage Examples

### Direct Service Call
```typescript
import { generateTitle } from "~/server/services/titleGenerator.service";

// Generate a title
const result = await generateTitle({
  prompt: "Create an animated intro for a tech podcast",
  contextId: "project-123"
});

console.log(result.title); // E.g., "Tech Podcast Intro"
```

### Through the Name Generator Utility
```typescript
import { generateAIProjectName } from "~/lib/nameGenerator";

// Generate a title with fallback capability
const title = await generateAIProjectName(
  "Make a promotional video for my coffee shop",
  "project-456"
);

console.log(title); // E.g., "Coffee Shop Promo"
```

## Integration Points

The service is integrated into the application at two primary points:

1. **Project Creation API**  
   When a project is created with an initial message, the title is automatically generated before saving.

2. **First Message in Chat**  
   When the first message is sent in a new project's chat, the title is generated and updated.

## Performance Considerations

- Title generation typically takes 200-500ms
- Uses a smaller, efficient model to minimize latency
- Includes logging of performance metrics for monitoring

## Logging
The service includes detailed logging with the following event types:
- `start`: When title generation begins
- `prompt`: When the prompt is sent to the LLM
- `llm`: When the LLM response is received
- `error`: When errors occur
- `success`: When title generation completes successfully 