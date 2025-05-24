//src/app/projects/[id]/generate/utils/getTemplateSnippet.ts

// Utility to strip whitespace and comments from code snippets
function stripWhitespaceAndComments(snippet: string): string {
  return snippet
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//') && !line.startsWith('/*'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Get template snippet based on pattern hint
export function getTemplateSnippet(patternHint?: string): string | null {
  const templates: Record<string, string> = {
    bounce: `
      const frame = useCurrentFrame();
      const bounceY = interpolate(frame % 60, [0, 30, 60], [0, -50, 0]);
      return (
        <div style={{
          transform: \`translateY(\${bounceY}px)\`,
          width: 100,
          height: 100,
          backgroundColor: '#ff6b6b'
        }}>
          Bouncing Element
        </div>
      );
    `,
    spin: `
      const frame = useCurrentFrame();
      const rotation = interpolate(frame, [0, 120], [0, 360]);
      return (
        <div style={{
          transform: \`rotate(\${rotation}deg)\`,
          width: 100,
          height: 100,
          backgroundColor: '#4ecdc4'
        }}>
          Spinning Element
        </div>
      );
    `,
    fade: `
      const frame = useCurrentFrame();
      const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
      return (
        <div style={{
          fontSize: 48,
          color: '#333',
          opacity
        }}>
          Fading Text
        </div>
      );
    `,
    slide: `
      const frame = useCurrentFrame();
      const translateX = interpolate(frame, [0, 60], [-200, 0], { extrapolateRight: 'clamp' });
      return (
        <div style={{
          transform: \`translateX(\${translateX}px)\`,
          fontSize: 32,
          color: '#2c3e50'
        }}>
          Sliding Content
        </div>
      );
    `
  };

  if (!patternHint || !templates[patternHint]) {
    return null;
  }

  const snippet = templates[patternHint];
  const cleaned = stripWhitespaceAndComments(snippet);
  
  // Ensure max 200 characters
  if (cleaned.length > 200) {
    return cleaned.substring(0, 197) + '...';
  }
  
  return cleaned;
}

// Fallback style hint when no snippet is available (max 20 tokens)
export function getDefaultStyleHint(): string {
  const hints = [
    'Use bright colors and smooth animations',
    'Create engaging visual effects with CSS transforms',
    'Add subtle shadows and gradients for depth',
    'Use spring animations for natural movement'
  ];
  
  const randomIndex = Math.floor(Math.random() * hints.length);
  return hints[randomIndex] ?? hints[0]!;
}