import type { AssetAgent } from './interfaces';
import type { Asset, Storyboard } from '../types/storyboard';

type OpenAIChatCompletionRequestMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// Valid asset types as a union type for type safety
type AssetType = 'image' | 'audio' | 'video' | 'font' | 'icon';

/**
 * AssetAgent - Responsible for identifying assets needed for a video
 * based on the storyboard content and style
 */
export class AIAssetAgent implements AssetAgent {
  private apiKey: string;
  
  constructor(apiKey?: string) {
    // Use environment variable if no API key is provided
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('AssetAgent initialized without API key. LLM calls will fail.');
    }
  }
  
  /**
   * Identify required assets for the storyboard
   */
  async identifyAssets(storyboard: Storyboard): Promise<Asset[]> {
    try {
      if (!this.apiKey) {
        throw new Error('Missing OpenAI API key');
      }
      
      const messages: OpenAIChatCompletionRequestMessage[] = [
        {
          role: 'system',
          content: `You are an asset identification expert for video production. Your job is to analyze a video storyboard
and identify all the visual and audio assets that will be needed. For each asset, determine:

1. A descriptive unique ID
2. The type of asset (image, audio, video, font, icon)
3. A suitable URL or placeholder for the asset
4. Necessary metadata about the asset

Output a JSON array with each asset having this structure:
[
  {
    "id": "asset-unique-id", // A descriptive ID that identifies this asset
    "type": "image", // One of: "image", "audio", "video", "font", "icon"
    "url": "https://example.com/asset.jpg", // URL to the asset or a placeholder
    "metadata": {
      // For images/video:
      "alt": "Description for screen readers",
      "width": 1920,
      "height": 1080,
      
      // For audio:
      "duration": 120, // in seconds
      "format": "mp3",
      
      // For fonts:
      "family": "Font name",
      "weight": "regular"
    }
  },
  // Additional assets...
]

Important guidelines:
- Identify both visual and audio assets needed across all scenes
- If multiple scenes need the same asset, list it only once
- Be specific about image content needed for each scene
- Consider background music that matches the style and mood
- Include any necessary fonts, icons, or UI elements
- For image URLs, you can use placeholder services like "https://placehold.co/600x400/png" or describe the image needed`
        },
        {
          role: 'user',
          content: `Identify the assets needed for this storyboard:
${JSON.stringify(storyboard, null, 2)}`
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
      
      // The content might be a JSON array or an object with an assets property
      let assets: Asset[];
      try {
        const parsed = JSON.parse(content);
        assets = Array.isArray(parsed) ? parsed : parsed.assets;
        
        // Ensure assets is an array
        if (!Array.isArray(assets)) {
          throw new Error('Expected assets to be an array');
        }
      } catch (error) {
        console.error('Error parsing asset identification response:', error, content);
        throw new Error('Failed to parse asset identification response');
      }
      
      // Validate and normalize the assets
      const normalizedAssets = this.normalizeAssets(assets);
      
      return normalizedAssets;
    } catch (error) {
      console.error('Error identifying assets:', error);
      
      // Return fallback assets if LLM call fails
      return this.getFallbackAssets(storyboard);
    }
  }
  
  /**
   * Normalize and validate the assets returned by the LLM
   */
  private normalizeAssets(assets: Asset[]): Asset[] {
    return assets.map((asset, index) => {
      // If asset is missing an id, generate one
      if (!asset.id) {
        asset.id = `asset-${index + 1}`;
      }
      
      // Ensure type is valid
      if (!asset.type || !this.isValidAssetType(asset.type)) {
        // Try to guess the type from the URL or default to image
        const guessedType = this.guessAssetType(asset.url);
        asset.type = (guessedType || 'image') as AssetType;
      }
      
      // Ensure URL exists
      if (!asset.url) {
        asset.url = this.getPlaceholderUrl(asset.type);
      }
      
      // Ensure metadata
      asset.metadata = asset.metadata || {};
      
      // Add type-specific metadata if missing
      switch (asset.type) {
        case 'image':
        case 'video':
          asset.metadata.alt = asset.metadata.alt || `${asset.type} asset ${index + 1}`;
          asset.metadata.width = asset.metadata.width || 1920;
          asset.metadata.height = asset.metadata.height || 1080;
          break;
          
        case 'audio':
          asset.metadata.duration = asset.metadata.duration || 120;
          asset.metadata.format = asset.metadata.format || 'mp3';
          break;
          
        case 'font':
          asset.metadata.family = asset.metadata.family || 'Inter';
          asset.metadata.weight = asset.metadata.weight || 'regular';
          break;
      }
      
      return asset;
    });
  }
  
  /**
   * Check if an asset type is valid
   */
  private isValidAssetType(type: string): type is AssetType {
    const validTypes: AssetType[] = ['image', 'audio', 'video', 'font', 'icon'];
    return validTypes.includes(type as AssetType);
  }
  
  /**
   * Try to guess the asset type from its URL
   */
  private guessAssetType(url?: string): AssetType | null {
    if (!url) return null;
    
    const lowerUrl = url.toLowerCase();
    
    // Check for image extensions
    if (/\.(jpg|jpeg|png|gif|svg|webp)($|\?)/.test(lowerUrl)) {
      return 'image';
    }
    
    // Check for audio extensions
    if (/\.(mp3|wav|ogg|flac)($|\?)/.test(lowerUrl)) {
      return 'audio';
    }
    
    // Check for video extensions
    if (/\.(mp4|webm|mov|avi)($|\?)/.test(lowerUrl)) {
      return 'video';
    }
    
    // Check for font extensions
    if (/\.(ttf|otf|woff|woff2)($|\?)/.test(lowerUrl)) {
      return 'font';
    }
    
    return null;
  }
  
  /**
   * Get a placeholder URL for a given asset type
   */
  private getPlaceholderUrl(type: AssetType): string {
    switch (type) {
      case 'image':
        return 'https://placehold.co/1920x1080/png';
      case 'video':
        return 'https://placehold.co/1920x1080/mp4';
      case 'audio':
        return 'https://example.com/placeholder-audio.mp3';
      case 'font':
        return 'https://fonts.googleapis.com/css2?family=Inter&display=swap';
      case 'icon':
        return 'https://placehold.co/24x24/svg';
      default:
        return 'https://placehold.co/600x400/png';
    }
  }
  
  /**
   * Get fallback assets if AI identification fails
   */
  private getFallbackAssets(storyboard: Storyboard): Asset[] {
    const assets: Asset[] = [];
    
    // Add a basic background music asset
    assets.push({
      id: 'bgm-1',
      type: 'audio',
      url: 'https://example.com/background-music.mp3',
      metadata: {
        duration: 180,
        format: 'mp3'
      }
    });
    
    // Add a placeholder image for each scene
    storyboard.scenes.forEach((scene, index) => {
      assets.push({
        id: `image-${index + 1}`,
        type: 'image',
        url: `https://placehold.co/1920x1080/png?text=Scene+${index + 1}`,
        metadata: {
          alt: `Placeholder for ${scene.name}`,
          width: 1920,
          height: 1080
        }
      });
    });
    
    // Add basic font assets if style is defined
    if (storyboard.style) {
      if (storyboard.style.fontPrimary) {
        assets.push({
          id: 'font-primary',
          type: 'font',
          url: `https://fonts.googleapis.com/css2?family=${storyboard.style.fontPrimary.replace(' ', '+')}&display=swap`,
          metadata: {
            family: storyboard.style.fontPrimary,
            weight: 'regular'
          }
        });
      }
      
      if (storyboard.style.fontSecondary) {
        assets.push({
          id: 'font-secondary',
          type: 'font',
          url: `https://fonts.googleapis.com/css2?family=${storyboard.style.fontSecondary.replace(' ', '+')}&display=swap`,
          metadata: {
            family: storyboard.style.fontSecondary,
            weight: 'regular'
          }
        });
      }
    }
    
    return assets;
  }
} 