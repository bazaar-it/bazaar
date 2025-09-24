import { extractDurationFromCode, analyzeDuration } from "../codeDurationExtractor";

describe("codeDurationExtractor", () => {
  it("extracts literal duration from suffixed export", () => {
    const code = `
const { AbsoluteFill } = window.Remotion;

export default function AnimateLogo() { return <AbsoluteFill />; }
export const durationInFrames_animate_logo = 240;
`;

    expect(extractDurationFromCode(code)).toBe(240);
    const analysis = analyzeDuration(code);
    expect(analysis.frames).toBe(240);
    expect(analysis.source).toContain("NEW literal duration");
  });

  it("continues to extract legacy literal duration", () => {
    const code = `
export const durationInFrames = 150;
`;
    expect(extractDurationFromCode(code)).toBe(150);
  });

  it("falls back to default when no duration export exists", () => {
    const code = `
const { AbsoluteFill } = window.Remotion;
export default function Scene() { return <AbsoluteFill />; }
`;
    expect(extractDurationFromCode(code)).toBe(180);
  });
});
