export type SceneLike = {
  id: string;
  start?: number;
  duration?: number;
  data?: any;
  name?: string;
};

export type SceneRange = {
  id: string;
  index: number;
  start: number; // inclusive
  end: number;   // inclusive
  duration: number;
  name?: string;
};

export function computeSceneRanges(scenes: SceneLike[] | undefined | null): SceneRange[] {
  const list = scenes || [];
  let cursor = 0;
  return list.map((s, i) => {
    const start = typeof s.start === 'number' ? s.start : cursor;
    const duration = Math.max(1, Math.floor(s.duration ?? 150));
    const end = start + duration - 1; // inclusive
    cursor = end + 1;
    return {
      id: s.id,
      index: i,
      start,
      end,
      duration,
      name: (s as any)?.name || (s as any)?.data?.name,
    };
  });
}

export function findSceneAtFrame(ranges: SceneRange[], frame: number): SceneRange | null {
  for (const r of ranges) {
    if (frame >= r.start && frame <= r.end) return r;
  }
  return null;
}

