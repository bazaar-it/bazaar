import type { SceneAgent } from './interfaces';
import type { Scene } from '../types/storyboard';

type OpenAIChatCompletionRequestMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * SceneAgent - Responsible for planning the scenes that make up a video
 * based on user prompt and additional instructions
 */
export class AISceneAgent implements SceneAgent {
  private apiKey: string;
  
  constructor(apiKey?: string) {
    // Use environment variable if no API key is provided
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('SceneAgent initialized without API key. LLM calls will fail.');
    }
  }
  
  /**
   * Plan a sequence of scenes based on the user prompt
   */
  async planScenes(
    userPrompt: string, 
    additionalInstructions?: string,
    maxScenes: number = 5
  ): Promise<Scene[]> {
    try {
      if (!this.apiKey) {
        throw new Error('Missing OpenAI API key');
      }
      
      // Ensure maxScenes is within reasonable limits
      maxScenes = Math.max(1, Math.min(maxScenes, 10));
      
      const messages: OpenAIChatCompletionRequestMessage[] = [
        {
          role: 'system',
          content: `You are a video storyboard planner. Your job is to break down a user's video idea into a sequence of scenes.
For each scene, you need to determine:
1. A descriptive name
2. The appropriate template to use (from: TitleScene, ContentScene, SplitScene, ListScene, QuoteScene, ImageScene, OutroScene)
3. The duration in frames (at 30fps, so 150 frames = 5 seconds)
4. The props needed for that scene template

Output a JSON array with each scene having this structure:
[
  {
    "id": "unique-scene-id", // Use a descriptive name with a number
    "name": "Scene name",
    "template": "TemplateName", // One of the template types listed above
    "start": number, // Frame number where the scene starts (0 for first scene, then cumulative)
    "duration": number, // Duration in frames (typically 120-300)
    "props": {
      // Props depend on the template, but typically include:
      "title": "Main scene title",
      "text": "Supporting text content",
      "items": ["For list scenes"],
      "imageUrl": "For image scenes",
      // Add any other props needed for the specific template
    },
    "metadata": {
      "description": "Scene description for reference",
      "prompt": "Original prompt text that led to this scene"
    }
  },
  // Additional scenes...
]

Important guidelines:
- The first scene should usually be a TitleScene with the video's main title
- The last scene should be an OutroScene with a conclusion or call-to-action
- Scenes should flow logically and tell a coherent story
- Typical scene duration is 150-300 frames (5-10 seconds)
- Don't exceed ${maxScenes} total scenes
- Make sure scene ids are unique and descriptive (e.g., "intro-scene-1")
- Set each scene's "start" property to be right after the previous scene ends
`
        },
        {
          role: 'user',
          content: `Plan a sequence of scenes for a video with the prompt: "${userPrompt}"${
            additionalInstructions ? `\n\nAdditional instructions: ${additionalInstructions}` : ''
          }\n\nPlease limit your response to a maximum of ${maxScenes} scenes.`
        }
      ];
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }
      
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // The content might be a JSON array or an object with a scenes property
      let scenes: Scene[];
      try {
        const parsed = JSON.parse(content);
        scenes = Array.isArray(parsed) ? parsed : parsed.scenes;
        
        // Ensure scenes is an array
        if (!Array.isArray(scenes)) {
          throw new Error('Expected scenes to be an array');
        }
      } catch (error) {
        console.error('Error parsing scene planning response:', error, content);
        throw new Error('Failed to parse scene planning response');
      }
      
      // Validate and normalize the scenes
      const normalizedScenes = this.normalizeScenes(scenes, maxScenes);
      
      return normalizedScenes;
    } catch (error) {
      console.error('Error planning scenes:', error);
      
      // Return fallback scenes if LLM call fails
      return this.getFallbackScenes(userPrompt, maxScenes);
    }
  }
  
  /**
   * Normalize and validate the scenes returned by the LLM
   */
  private normalizeScenes(scenes: Scene[], maxScenes: number): Scene[] {
    // Limit the number of scenes
    scenes = scenes.slice(0, maxScenes);
    
    // Ensure each scene has the required properties
    let previousEnd = 0;
    
    return scenes.map((scene, index) => {
      // If scene is missing an id, generate one
      if (!scene.id) {
        scene.id = `scene-${index + 1}`;
      }
      
      // Use the scene index if no name is provided
      if (!scene.name) {
        scene.name = `Scene ${index + 1}`;
      }
      
      // Default to ContentScene if template is missing
      if (!scene.template || !this.isValidTemplate(scene.template)) {
        scene.template = index === 0 ? 'TitleScene' : 
                         index === scenes.length - 1 ? 'OutroScene' : 
                         'ContentScene';
      }
      
      // Ensure the start property is set correctly
      scene.start = previousEnd;
      
      // Ensure duration is reasonable
      if (!scene.duration || scene.duration < 60 || scene.duration > 600) {
        scene.duration = 150; // Default to 5 seconds
      }
      
      // Update previousEnd for the next scene
      previousEnd = scene.start + scene.duration;
      
      // Ensure props object exists
      scene.props = scene.props || {};
      
      // Add default props based on template if missing
      if (scene.template === 'TitleScene' && !scene.props.title) {
        scene.props.title = 'Video Title';
      }
      
      // Ensure metadata
      scene.metadata = scene.metadata || {
        description: `Scene ${index + 1}`,
        prompt: ''
      };
      
      return scene;
    });
  }
  
  /**
   * Check if a template name is valid
   */
  private isValidTemplate(template: string): boolean {
    const validTemplates = [
      'TitleScene', 
      'ContentScene', 
      'SplitScene', 
      'ListScene', 
      'QuoteScene', 
      'ImageScene', 
      'OutroScene'
    ];
    return validTemplates.includes(template);
  }
  
  /**
   * Get fallback scenes if AI planning fails
   */
  private getFallbackScenes(userPrompt: string, maxScenes: number): Scene[] {
    // Create a basic 3-scene structure: title, content, outro
    const count = Math.min(maxScenes, 3);
    
    const scenes: Scene[] = [];
    
    // Always include a title scene
    scenes.push({
      id: 'scene-1',
      name: 'Title',
      template: 'TitleScene',
      start: 0,
      duration: 150,
      props: {
        title: 'Video Title',
        text: userPrompt.slice(0, 100) // Use part of the prompt as subtitle
      },
      metadata: {
        description: 'Title scene',
        prompt: userPrompt
      }
    });
    
    // Add content scene(s) if we have room
    if (count > 1) {
      scenes.push({
        id: 'scene-2',
        name: 'Content',
        template: 'ContentScene',
        start: 150,
        duration: 150,
        props: {
          title: 'Main Content',
          text: 'Content based on your prompt will appear here.'
        },
        metadata: {
          description: 'Main content scene',
          prompt: userPrompt
        }
      });
    }
    
    // Add an outro if we have room
    if (count > 2) {
      scenes.push({
        id: 'scene-3',
        name: 'Conclusion',
        template: 'OutroScene',
        start: 300,
        duration: 150,
        props: {
          title: 'Thank You',
          text: 'Thanks for watching!'
        },
        metadata: {
          description: 'Conclusion scene',
          prompt: userPrompt
        }
      });
    }
    
    return scenes;
  }
} 