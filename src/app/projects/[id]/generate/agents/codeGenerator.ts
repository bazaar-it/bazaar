import type { CodeGenerator } from './interfaces';
import type { Storyboard, Scene } from '../types/storyboard';

type OpenAIChatCompletionRequestMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * CodeGenerator - Responsible for generating React components for video scenes
 */
export class AICodeGenerator implements CodeGenerator {
  private apiKey: string;
  
  constructor(apiKey?: string) {
    // Use environment variable if no API key is provided
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('CodeGenerator initialized without API key. LLM calls will fail.');
    }
  }
  
  /**
   * Generate component code for each scene in the storyboard
   */
  async generateSceneComponents(
    storyboard: Storyboard,
    progressCallback: (completedScenes: number) => void
  ): Promise<boolean> {
    try {
      if (!this.apiKey) {
        throw new Error('Missing OpenAI API key');
      }
      
      const { scenes } = storyboard;
      let completedCount = 0;
      
      // Process each scene sequentially to avoid rate limiting
      for (const scene of scenes) {
        try {
          await this.generateComponentForScene(scene, storyboard);
        } catch (error) {
          console.error(`Error generating component for scene ${scene.id}:`, error);
        }
        
        // Update progress regardless of success/failure of individual scenes
        completedCount++;
        progressCallback(completedCount);
      }
      
      return true;
    } catch (error) {
      console.error('Error generating scene components:', error);
      return false;
    }
  }
  
  /**
   * Generate a React component for a specific scene
   */
  private async generateComponentForScene(scene: Scene, storyboard: Storyboard): Promise<string> {
    const messages: OpenAIChatCompletionRequestMessage[] = [
      {
        role: 'system',
        content: `You are a React component generator for video animations. Your job is to create a Remotion component
for a specific scene in a video based on a template and props.

You should generate clean, well-structured React TypeScript code that:
1. Uses Remotion's animation primitives (useCurrentFrame, interpolate, etc.)
2. Follows best practices for performance
3. Uses the scene template, props, and style information provided

The component should:
- Import necessary dependencies
- Define a props interface
- Export a default React functional component
- Use appropriate animations based on the scene template
- Apply the visual style from the storyboard

Output only the component code without any explanation, markdown, or additional text.`
      },
      {
        role: 'user',
        content: `Generate a Remotion component for this scene:
${JSON.stringify(scene, null, 2)}

Style guidelines:
${JSON.stringify(storyboard.style, null, 2)}

Use the appropriate template based on scene.template and ensure the component:
- Is named ${this.getComponentNameFromScene(scene)}
- Renders for the specified duration (${scene.duration} frames)
- Correctly uses all props
- Has appropriate animations for entering and exiting`
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
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    const generatedCode = data.choices[0].message.content;
    
    // In a real implementation, we'd save this code to a file, compile it, etc.
    // Here we're just returning it for simulation purposes
    return generatedCode;
  }
  
  /**
   * Generate a component name from a scene
   */
  private getComponentNameFromScene(scene: Scene): string {
    // Format: TemplateNameSceneId
    // Example: TitleScene1, ContentScene2, etc.
    const template = scene.template || 'Content';
    const id = scene.id.replace(/[^a-zA-Z0-9]/g, '');
    return `${template}${id}`;
  }
} 