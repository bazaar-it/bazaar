/**
 * Scene Message Formatter
 * Generates descriptive messages for scene operations to improve chat feedback
 */

import type { SceneEntity } from "~/generated/entities";

export function formatSceneOperationMessage(
  operation: 'create' | 'edit' | 'delete' | 'trim',
  scene: SceneEntity | { name: string; order?: number },
  details?: {
    userPrompt?: string;
    previousDuration?: number;
    newDuration?: number;
    scenesCreated?: number;
  }
): string {
  const sceneName = scene.name || `Scene ${(scene.order ?? 0) + 1}`;
  
  switch (operation) {
    case 'create': {
      // Extract key elements from the prompt for a better description
      const prompt = details?.userPrompt || '';
      let description = '';
      
      // Look for specific content indicators
      if (prompt.match(/text|title|heading|typography/i)) {
        const textMatch = prompt.match(/["']([^"']+)["']/);
        if (textMatch?.[1]) {
          description = ` with text "${textMatch[1]}"`;
        } else {
          description = ' with animated text';
        }
      } else if (prompt.match(/logo/i)) {
        description = ' with logo animation';
      } else if (prompt.match(/particle|effect/i)) {
        description = ' with particle effects';
      } else if (prompt.match(/transition/i)) {
        description = ' transition';
      } else if (prompt.match(/intro/i)) {
        description = ' intro';
      } else if (prompt.match(/outro/i)) {
        description = ' outro';
      } else if (prompt.match(/dashboard|chart|graph/i)) {
        description = ' with data visualization';
      } else if (prompt.match(/image|photo|picture/i)) {
        description = ' from image';
      } else if (prompt.match(/video/i)) {
        description = ' from video';
      }
      
      if (details?.scenesCreated && details.scenesCreated > 1) {
        return `Created ${details.scenesCreated} new scenes${description}`;
      }
      
      return `Created "${sceneName}"${description}`;
    }
    
    case 'edit': {
      const prompt = details?.userPrompt || '';
      let changeDescription = '';
      
      // Detect what was changed based on the prompt
      if (prompt.match(/color|colour/i)) {
        const colorMatch = prompt.match(/\b(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey)\b/i);
        if (colorMatch) {
          changeDescription = ` - changed colors to ${colorMatch[1].toLowerCase()}`;
        } else {
          changeDescription = ' - updated colors';
        }
      } else if (prompt.match(/text|title|heading/i)) {
        const textMatch = prompt.match(/["']([^"']+)["']/);
        if (textMatch?.[1]) {
          changeDescription = ` - changed text to "${textMatch[1]}"`;
        } else {
          changeDescription = ' - updated text';
        }
      } else if (prompt.match(/animation|animate|motion/i)) {
        changeDescription = ' - enhanced animations';
      } else if (prompt.match(/speed|faster|slower|quick/i)) {
        changeDescription = ' - adjusted animation speed';
      } else if (prompt.match(/size|bigger|smaller|larger/i)) {
        changeDescription = ' - resized elements';
      } else if (prompt.match(/position|move|align/i)) {
        changeDescription = ' - repositioned elements';
      } else if (prompt.match(/font|typography/i)) {
        changeDescription = ' - updated typography';
      } else if (prompt.match(/fix|repair|correct/i)) {
        changeDescription = ' - fixed issues';
      } else if (prompt.match(/improve|enhance|better/i)) {
        changeDescription = ' - enhanced visuals';
      }
      
      return `Updated "${sceneName}"${changeDescription}`;
    }
    
    case 'delete':
      return `Removed "${sceneName}" from timeline`;
    
    case 'trim': {
      if (details?.previousDuration && details?.newDuration) {
        const prevSeconds = (details.previousDuration / 30).toFixed(1);
        const newSeconds = (details.newDuration / 30).toFixed(1);
        return `Adjusted "${sceneName}" duration from ${prevSeconds}s to ${newSeconds}s`;
      }
      return `Trimmed "${sceneName}" duration`;
    }
    
    default:
      return `Modified "${sceneName}"`;
  }
}

/**
 * Format a message for manual edits
 */
export function formatManualEditMessage(
  editType: 'code' | 'duration',
  sceneName: string,
  details?: {
    previousDuration?: number;
    newDuration?: number;
    codeChangeSummary?: string;
  }
): string {
  if (editType === 'duration' && details?.previousDuration && details?.newDuration) {
    const prevSeconds = (details.previousDuration / 30).toFixed(1);
    const newSeconds = (details.newDuration / 30).toFixed(1);
    return `⏱️ Manually adjusted "${sceneName}" duration from ${prevSeconds}s to ${newSeconds}s`;
  }
  
  if (editType === 'code') {
    // More descriptive messages for code edits
    const actions = [
      `✏️ Manually edited "${sceneName}" code`,
      `🔧 Modified "${sceneName}" in Code Editor`,
      `💻 Updated "${sceneName}" implementation`,
      `🎨 Refined "${sceneName}" visuals`,
      `⚡ Tweaked "${sceneName}" animations`
    ];
    // Pick a random one for variety (or could analyze the code diff for specifics)
    return actions[0]; // For now, use the first one consistently
  }
  
  return `📝 Manually modified "${sceneName}"`;
}