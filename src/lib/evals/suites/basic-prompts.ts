//src/lib/evals/suites/basic-prompts.ts

import type { EvalSuite } from '../types';

export const basicPromptsSuite: EvalSuite = {
  id: 'basic-prompts',
  name: 'Basic Text Prompts',
  description: 'Simple text generation prompts to test model quality and consistency',
  modelPacks: ['claude-pack', 'starter-pack-1', 'performance-pack'],
  services: ['brain', 'codeGenerator'],
  prompts: [
    {
      id: 'hello-world',
      name: 'Hello World',
      type: 'text',
      input: {
        text: 'Write a simple "Hello, World!" program in JavaScript with comments explaining each part.',
      },
      expectedOutput: {
        type: 'contains',
        value: 'console.log',
      },
    },
    {
      id: 'explain-concept',
      name: 'Explain Programming Concept',
      type: 'text',
      input: {
        text: 'Explain what recursion is in programming with a simple example.',
      },
      expectedOutput: {
        type: 'contains',
        value: 'function',
      },
    },
    {
      id: 'creative-story',
      name: 'Creative Writing',
      type: 'text',
      input: {
        text: 'Write a short story about a robot learning to paint. Keep it under 200 words.',
      },
    },
    {
      id: 'problem-solving',
      name: 'Problem Solving',
      type: 'text',
      input: {
        text: 'How would you optimize a slow database query that takes 5 seconds to return results?',
      },
      expectedOutput: {
        type: 'contains',
        value: 'index',
      },
    },
  ],
};

export const codeGenerationSuite: EvalSuite = {
  id: 'code-generation',
  name: 'Code Generation Tests',
  description: 'Tests for code generation quality and accuracy',
  modelPacks: ['claude-pack', 'mixed-pack', 'performance-pack'],
  services: ['codeGenerator', 'directCodeEditor.surgical', 'directCodeEditor.creative'],
  prompts: [
    {
      id: 'react-component',
      name: 'React Component',
      type: 'code',
      input: {
        text: 'Create a React functional component that displays a loading spinner with TypeScript types.',
        context: {
          framework: 'React',
          language: 'TypeScript',
          styling: 'CSS modules',
        },
      },
      expectedOutput: {
        type: 'contains',
        value: 'interface',
      },
    },
    {
      id: 'api-endpoint',
      name: 'API Endpoint',
      type: 'code',
      input: {
        text: 'Create a Next.js API route that handles POST requests to create a new user with validation.',
        context: {
          framework: 'Next.js',
          database: 'PostgreSQL',
          validation: 'Zod',
        },
      },
    },
    {
      id: 'utility-function',
      name: 'Utility Function',
      type: 'code',
      input: {
        text: 'Write a TypeScript utility function that debounces function calls with proper typing.',
      },
      expectedOutput: {
        type: 'contains',
        value: 'setTimeout',
      },
    },
  ],
};

export const visionTestSuite: EvalSuite = {
  id: 'vision-analysis',
  name: 'Vision Analysis Tests',
  description: 'Tests for image analysis and description capabilities',
  modelPacks: ['claude-pack', 'mixed-pack'],
  services: ['visionAnalysis', 'imageDescription', 'analyzeImage'],
  prompts: [
    {
      id: 'describe-ui',
      name: 'Describe UI Screenshot',
      type: 'image',
      input: {
        text: 'Describe the user interface elements in this screenshot. What kind of application is this?',
        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...', // Sample base64 image
      },
    },
    {
      id: 'extract-text',
      name: 'Extract Text from Image',
      type: 'image',
      input: {
        text: 'Extract all the text visible in this image and format it as a bulleted list.',
        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...', // Sample base64 image
      },
    },
    {
      id: 'design-analysis',
      name: 'Design Analysis',
      type: 'image',
      input: {
        text: 'Analyze the design of this interface. What are the strengths and potential improvements?',
        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...', // Sample base64 image
      },
    },
  ],
};

export const remotionSceneSuite: EvalSuite = {
  id: 'remotion-scenes',
  name: 'Remotion Scene Generation',
  description: 'Tests for generating Remotion video scene components',
  modelPacks: ['claude-pack', 'mixed-pack', 'performance-pack'],
  services: ['addScene', 'editScene', 'sceneBuilder'],
  prompts: [
    {
      id: 'simple-text-scene',
      name: 'Simple Text Scene',
      type: 'scene',
      input: {
        text: 'Create a Remotion scene that displays "Welcome to Bazaar-Vid" with a fade-in animation.',
        context: {
          duration: 3,
          dimensions: { width: 1920, height: 1080 },
          style: 'modern',
        },
      },
      expectedOutput: {
        type: 'contains',
        value: 'interpolate',
      },
    },
    {
      id: 'complex-animation',
      name: 'Complex Animation Scene',
      type: 'scene',
      input: {
        text: 'Create a scene with multiple text elements that animate in sequence with different easing functions.',
        context: {
          duration: 5,
          elements: ['title', 'subtitle', 'cta'],
          animations: ['slideIn', 'fadeIn', 'bounce'],
        },
      },
    },
    {
      id: 'background-image',
      name: 'Background Image Scene',
      type: 'scene',
      input: {
        text: 'Create a scene with a background image and overlay text that scales up from 0.',
        context: {
          duration: 4,
          hasBackground: true,
          textAnimation: 'scale',
        },
      },
    },
  ],
};

// Export all suites for easy access
export const allEvalSuites = [
  basicPromptsSuite,
  codeGenerationSuite,
  visionTestSuite,
  remotionSceneSuite,
];
