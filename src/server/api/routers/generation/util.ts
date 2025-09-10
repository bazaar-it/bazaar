export type ImageDirective = {
  url: string;
  action: 'embed' | 'recreate' | string;
  target?: { sceneId?: string; selector?: string } | 'newScene';
};

export function extractTargetSelectorFromDirectives(
  directives: ImageDirective[] | undefined,
  sceneId?: string
): string | undefined {
  if (!Array.isArray(directives) || directives.length === 0 || !sceneId) return undefined;
  const match = directives.find(
    (d) => typeof d.target === 'object' && d.target?.sceneId === sceneId && !!d.target?.selector
  );
  return (match?.target as any)?.selector as string | undefined;
}

