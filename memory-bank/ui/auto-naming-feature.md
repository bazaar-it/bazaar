# AI-Powered Video Project Naming Feature

## Overview
The AI-Powered Project Naming feature automatically creates a meaningful, contextually relevant title for video projects based on the user's first chat prompt. This replaces the previous regex-based naming approach with more intelligent, LLM-powered title generation that better understands the user's intent and the project's purpose.

## Implementation Details

### 1. Title Generation Service (`src/server/services/titleGenerator.service.ts`)
- Implements an OpenAI-based title generation service using function calling
- Processes user prompts through a specialized LLM with specific instructions
- Returns structured responses with title and optional reasoning
- Includes comprehensive error handling and logging
- Falls back to default title ("New Video Project") if generation fails

### 2. Name Generator Utilities (`src/lib/nameGenerator.ts`)
- Provides both AI-powered and regex-based title generation
- `generateAIProjectName()`: Async function that calls the LLM service
- `generateNameFromPrompt()`: Original regex-based function (kept as fallback)
- Includes error handling to ensure a title is always generated

### 3. Project Creation Integration (`src/server/api/routers/project.ts`)
- Automatically generates AI-powered titles when creating projects with an initial message
- Falls back to the incremental "Untitled Video X" naming scheme when:
  - No initial message is provided
  - AI title generation fails
  - The AI generates a generic title like "New Project"

### 4. Chat Interface Integration (`src/app/projects/[id]/edit/panels/ChatPanel.tsx`)
- Detects when the first message is sent in a new project
- Triggers AI-powered title generation based on message content
- Immediately updates the project title using the project.rename API
- Falls back to regex-based naming if AI generation fails

## Technical Design

### AI Title Generation Process
1. **Input Processing**: User's initial message is captured and passed to the title generator
2. **LLM Request**: The prompt is sent to OpenAI's API with specific parameters:
   - System message defining the title generator's role and constraints
   - Function calling to ensure structured output
   - The model is instructed to generate concise, descriptive titles (2-6 words)
3. **Response Handling**: The service extracts and validates the generated title
4. **Fallback Mechanism**: Multiple fallback layers ensure a title is always generated

### API Flow
```
User Message → LLM Title Generator → Project Rename API → UI Update
```

## Example Transformations

| User Prompt | AI-Generated Title | Old Regex-Based Title |
|-------------|-------------------|------------------------|
| "Create a demo video for my AI recipe app" | "AI Recipe Assistant" | "Demo Video For My" |
| "I want to make a presentation about climate change" | "Climate Change Impact" | "Presentation About Climate" |
| "Can you create an animated logo for my startup?" | "Startup Logo Animation" | "Animated Logo For My" |
| "Make a product tour for our new SaaS platform" | "SaaS Platform Tour" | "Product Tour For Our" |

## Future Improvements
- Add notification when a project is renamed to improve user awareness
- Allow users to approve or modify the suggested name
- Consider title generation preferences/settings for users
- Cache titles for common project types for faster response times
- Provide alternative title suggestions

## Configuration
The feature uses the `o4-mini` model for efficient title generation with low latency.

## Diagrams

### Process Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ User sends  │     │ AI generates│     │ Project is  │
│ first chat  │────►│ contextual  │────►│ renamed with│
│ message     │     │ title       │     │ new title   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Fallback Mechanism
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Try AI      │     │ If fails,   │     │ If fails,   │
│ title       │────►│ try regex   │────►│ use default │
│ generation  │     │ generation  │     │ naming      │
└─────────────┘     └─────────────┘     └─────────────┘
``` 