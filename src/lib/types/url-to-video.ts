export interface UrlToVideoUserInputs {
  problemStatement?: string;
  differentiators?: string;
  musicPreferenceId?: string;
  musicPreferenceName?: string;
  requestedDurationSeconds?: number;
}

export const MUSIC_LIBRARY = [
  {
    id: "cyberpunk-action-intro",
    name: "Cyberpunk Action Intro",
    mood: "Energetic",
    url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/brain-implant-cyberpunk-sci-fi-trailer-action-intro-330416.mp3"
  },
  {
    id: "action-trailer-glitch",
    name: "Action Trailer Glitch",
    mood: "Bold",
    url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/follow-the-leader-action-trailer-glitch-intro-146760.mp3"
  },
  {
    id: "future-design",
    name: "Future Design",
    mood: "Modern",
    url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/future-design-344320.mp3"
  },
  {
    id: "inspiring-ambient-lounge",
    name: "Inspiring Ambient Lounge",
    mood: "Calm",
    url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/in-slow-motion-inspiring-ambient-lounge-219592.mp3"
  }
] as const;
