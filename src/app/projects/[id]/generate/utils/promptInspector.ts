// /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/app/projects/[id]/generate/utils/promptInspector.ts

import { z } from 'zod';

export interface PromptInsight {
  specificity: 'high' | 'low';
  requestedDurationSec?: number;
  patternHint?: string;
}

export function analyzePrompt(userPrompt: string): PromptInsight {
  const prompt = userPrompt.toLowerCase().trim();
  
  // High-specificity tokens (technical/specific terms)
  const highSpecTokens = [
    'interpolate', 'spring', 'sequence', 'absolutefill', 'useCurrentFrame',
    'durationInFrames', 'fps', 'width', 'height', 'transform', 'translate',
    'rotate', 'scale', 'opacity', 'backgroundColor', 'fontSize', 'fontFamily',
    'position', 'top', 'left', 'right', 'bottom', 'margin', 'padding',
    'border', 'borderRadius', 'boxShadow', 'gradient', 'linear-gradient',
    'radial-gradient', 'animation', 'transition', 'keyframes', '@keyframes',
    'cubic-bezier', 'ease-in', 'ease-out', 'ease-in-out', 'linear',
    'translateX', 'translateY', 'translateZ', 'rotateX', 'rotateY', 'rotateZ',
    'scaleX', 'scaleY', 'skewX', 'skewY', 'matrix', 'perspective'
  ];

  // Visual property tokens
  const visualTokens = [
    'color', 'size', 'move', 'spin', 'fade', 'slide', 'bounce', 'zoom',
    'blur', 'glow', 'shadow', 'bright', 'dark', 'fast', 'slow', 'smooth'
  ];

  // Count high-specificity matches
  const highSpecMatches = highSpecTokens.filter(token => prompt.includes(token)).length;
  
  // Count visual property matches
  const visualMatches = visualTokens.filter(token => prompt.includes(token)).length;

  // Duration extraction
  const durationMatch = /\b(\d+)\s*(s|sec|seconds)\b/.exec(prompt);
  const requestedDurationSec = durationMatch?.[1] ? parseInt(durationMatch[1], 10) : undefined;

  // Determine specificity: require 2+ high-spec tokens OR duration + visual property
  const isHighSpecificity = highSpecMatches >= 2 || (requestedDurationSec !== undefined && visualMatches >= 1);

  return {
    specificity: isHighSpecificity ? 'high' : 'low',
    requestedDurationSec,
    patternHint: isHighSpecificity ? undefined : getPatternHint(prompt)
  };
}

function getPatternHint(prompt: string): string | undefined {
  // Pattern detection for template matching
  if (prompt.includes('bounce') || prompt.includes('jump')) return 'bounce';
  if (prompt.includes('spin') || prompt.includes('rotate')) return 'spin';
  if (prompt.includes('fade') || prompt.includes('appear')) return 'fade';
  if (prompt.includes('slide') || prompt.includes('move')) return 'slide';
  if (prompt.includes('zoom') || prompt.includes('scale')) return 'zoom';
  if (prompt.includes('pulse') || prompt.includes('beat')) return 'pulse';
  if (prompt.includes('wave') || prompt.includes('flow')) return 'wave';
  if (prompt.includes('glow') || prompt.includes('shine')) return 'glow';
  
  return undefined;
}
