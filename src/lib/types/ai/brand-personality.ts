/**
 * Brand Personality Types
 *
 * Sprint 126 - URL to Perfect Video
 *
 * 6-dimensional personality scores for intelligent template and music selection
 */

export interface BrandPersonality {
  corporate: number;      // 0 = casual startup, 1 = enterprise professional
  minimalist: number;     // 0 = maximalist/busy, 1 = clean/minimal
  playful: number;        // 0 = serious/formal, 1 = fun/lighthearted
  technical: number;      // 0 = emotional/human, 1 = technical/data-driven
  bold: number;           // 0 = subtle/understated, 1 = bold/attention-grabbing
  modern: number;         // 0 = traditional/classic, 1 = cutting-edge/trendy
}

/**
 * Calculate similarity between two personalities (0-1, higher = more similar)
 */
export function calculatePersonalitySimilarity(
  a: BrandPersonality,
  b: BrandPersonality
): number {
  const dimensions: Array<keyof BrandPersonality> = [
    'corporate', 'minimalist', 'playful', 'technical', 'bold', 'modern'
  ];

  const diffs = dimensions.map(key => Math.abs(a[key] - b[key]));
  const avgDiff = diffs.reduce((sum, diff) => sum + diff, 0) / dimensions.length;

  return 1 - avgDiff; // Convert difference to similarity
}

/**
 * Get human-readable description of personality
 */
export function describePersonality(personality: BrandPersonality): string {
  const traits: string[] = [];

  if (personality.corporate > 0.7) traits.push('Enterprise');
  else if (personality.corporate < 0.3) traits.push('Casual');

  if (personality.minimalist > 0.7) traits.push('Minimalist');
  else if (personality.minimalist < 0.3) traits.push('Rich/Detailed');

  if (personality.playful > 0.7) traits.push('Playful');
  else if (personality.playful < 0.3) traits.push('Serious');

  if (personality.technical > 0.7) traits.push('Technical');
  else if (personality.technical < 0.3) traits.push('Emotional');

  if (personality.bold > 0.7) traits.push('Bold');
  else if (personality.bold < 0.3) traits.push('Subtle');

  if (personality.modern > 0.7) traits.push('Modern');
  else if (personality.modern < 0.3) traits.push('Classic');

  return traits.length > 0 ? traits.join(', ') : 'Balanced';
}
