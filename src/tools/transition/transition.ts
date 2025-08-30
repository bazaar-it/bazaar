import { BaseMCPTool } from "~/tools/helpers/base";
import type { TransitionToolInput, TransitionToolOutput, BoundaryPlan, BoundarySpec } from "~/tools/helpers/types";
import { transitionToolInputSchema } from "~/tools/helpers/types";

/**
 * TRANSITION Tool — Boundary refinement between two adjacent scenes.
 * Pure function: produces a BoundaryPlan and (optionally) minimal code updates
 * constrained to last/first N frames. Does not access DB.
 */
export class TransitionTool extends BaseMCPTool<TransitionToolInput, TransitionToolOutput> {
  name = "TRANSITION";
  description = "Smooth the transition between two scenes by refining the boundary overlap and easing.";
  inputSchema = transitionToolInputSchema;

  protected async execute(input: TransitionToolInput): Promise<TransitionToolOutput> {
    // Defaults and guardrails
    const fps = input.fps ?? 30;
    const defaultOverlap = Math.min(30, Math.floor(Math.min(input.aDuration, input.bDuration) * 0.2)); // cap at 30 or 20% of shorter

    const spec: BoundarySpec = {
      overlapFrames: input.requested?.overlapFrames || defaultOverlap,
      type: input.requested?.type || 'crossfade',
      easing: input.requested?.easing || 'easeInOutCubic',
      direction: input.requested?.direction, // only used for slide/push
    };

    // Build a minimal BoundaryPlan
    const plan: BoundaryPlan = {
      aSceneId: input.aSceneId,
      bSceneId: input.bSceneId,
      spec,
      edits: [
        {
          target: 'A',
          description: `Apply opacity ramp from 1→0 over last ${spec.overlapFrames} frames with ${spec.easing}`,
          snippet: this.buildOpacityRampSnippet('A', spec, fps, true),
        },
        {
          target: 'B',
          description: `Apply opacity ramp from 0→1 over first ${spec.overlapFrames} frames with ${spec.easing}`,
          snippet: this.buildOpacityRampSnippet('B', spec, fps, false),
        },
      ],
      reasoning: `Use a ${spec.type} with ${spec.overlapFrames}f overlap to ensure continuity. Easing=${spec.easing}.`
    };

    // For now, do not attempt to inject snippets into full TSX (safe default).
    // Downstream executor can apply the snippets via the Edit tool.
    return {
      success: true,
      plan,
      reasoning: plan.reasoning || 'Generated a boundary plan',
      chatResponse: `I will smooth the boundary with a ${spec.type} over ${spec.overlapFrames} frames.`,
    };
  }

  private buildOpacityRampSnippet(target: 'A'|'B', spec: BoundarySpec, fps: number, isEnding: boolean): string {
    // Provide a small, generic snippet that an editor tool can splice into code
    // Caller inserts into style/opacity calc near the boundary window.
    const dir = isEnding ? 'ending' : 'starting';
    return `// ${dir} window opacity ramp\n` +
      `import { interpolate, Easing } from 'remotion';\n` +
      `const frame = useCurrentFrame();\n` +
      `const overlap = ${spec.overlapFrames};\n` +
      `const easing = Easing.${spec.easing === 'easeInOutCubic' ? 'cubic' : spec.easing === 'easeOutQuad' ? 'quad' : spec.easing === 'easeInQuad' ? 'quad' : 'linear'};\n` +
      (isEnding
        ? `const opacity = interpolate(frame, [durationInFrames - overlap, durationInFrames], [1, 0], { easing });\n`
        : `const opacity = interpolate(frame, [0, overlap], [0, 1], { easing });\n`)
      + `// apply 'opacity' to the top-level container during the boundary window`;
  }
}

export const transitionTool = new TransitionTool();

