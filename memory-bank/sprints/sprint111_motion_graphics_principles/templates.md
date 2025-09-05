# One Cinematic Template — Portal + Morph + Camera Journey

This is a single, cohesive scene engineered to feel cinematic and intentional: push-in to a CTA, portal into a new canvas, content unfolds with micro‑staggers, and a gentle camera drift completes the move. It respects safe zones, keeps concurrent focal motions ≤ 3, and uses fps‑aware springs.

```jsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

export const durationInFrames_JAWDR0P1 = 240;

// Spring presets
const SPRING_GENTLE = { damping: 24, stiffness: 90 };
const SPRING_CRISP  = { damping: 20, stiffness: 120 };

export default function Scene_JAWDR0P1() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // CTA geometry (centered)
  const btnW = Math.min(280, width * 0.28);
  const btnH = 52;
  const btnX = width * 0.5 - btnW / 2;
  const btnY = height * 0.62;

  const cx = btnX + btnW / 2;
  const cy = btnY + btnH / 2;

  const targetScale = Math.min((width * 0.92) / btnW, (height * 0.92) / btnH);

  // Phases: 0-36 intro, 36-132 zoom, 120-240 inside world + drift
  const intro  = spring({ frame: frame - 0, fps, config: SPRING_GENTLE });
  const zoom   = spring({ frame: frame - 36, fps, config: SPRING_CRISP });
  const inside = spring({ frame: frame - 120, fps, config: SPRING_GENTLE });

  // Camera transform toward CTA (with correct transform-origin)
  const originX = (cx / width) * 100;
  const originY = (cy / height) * 100;
  const camScale = interpolate(zoom, [0, 1], [1, targetScale], { extrapolateRight: 'clamp' });
  const camTx = interpolate(zoom, [0, 1], [0, (width / 2 - cx)], { extrapolateRight: 'clamp' });
  const camTy = interpolate(zoom, [0, 1], [0, (height / 2 - cy)], { extrapolateRight: 'clamp' });

  // Subtle drift to the right in the inside world
  const drift = interpolate(inside, [0, 1], [0, 14]);

  // Button morphs to flat surface
  const btnRadius = interpolate(zoom, [0, 1], [12, 0], { extrapolateRight: 'clamp' });
  const ctaNudgeY = interpolate(frame, [32, 36, 48], [0, -4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0B1220, #0E1B2E)' }}>
      {/* CAMERA RIG (world before portal) */}
      <div
        style={{
          position: 'absolute', inset: 0,
          transformOrigin: `${originX}% ${originY}%`,
          transform: `translate(${camTx}px, ${camTy}px) scale(${camScale})`,
        }}
      >
        {/* Title */}
        <div style={{ position: 'absolute', top: 96, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Inter', fontSize: 44, fontWeight: 800, color: 'white', opacity: intro }}>Cinematic Product Storytelling</div>
          <div style={{ marginTop: 12, fontFamily: 'Inter', fontSize: 18, color: 'rgba(255,255,255,0.85)', opacity: intro }}>Travel through your UI like a world.</div>
        </div>

        {/* Mock primary surface */}
        <div
          style={{
            position: 'absolute',
            top: 160, left: 64, right: 64, height: 360,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)'
          }}
        />

        {/* CTA — zoom target */}
        <div
          style={{
            position: 'absolute',
            left: btnX, top: btnY, width: btnW, height: btnH,
            borderRadius: btnRadius,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #22D3EE, #3B82F6)',
            color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 16,
            transform: `translateY(${ctaNudgeY}px)`
          }}
        >
          Get Started
        </div>
      </div>

      {/* INSIDE WORLD (portal) */}
      <div
        style={{ position: 'absolute', inset: 0, opacity: inside, transform: `translateX(${drift}px)` }}
      >
        {/* Unified canvas */}
        <div
          style={{
            position: 'absolute',
            top: 64, left: 64, right: 64, bottom: 64,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            overflow: 'hidden'
          }}
        >
          {/* Light sweep intro */}
          <div
            style={{
              position: 'absolute', top: 0, left: 0, height: '100%', width: 180,
              transform: `translateX(${interpolate(inside, [0,1], [-200, width])}px) rotate(12deg)`,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent)',
              opacity: 0.12, filter: 'blur(20px)'
            }}
          />

          {/* Two tiles that converge and unify */}
          {(() => {
            const converge = spring({ frame: frame - 140, fps, config: SPRING_CRISP });
            const leftX  = interpolate(converge, [0,1], [-width*0.25, 0]);
            const rightX = interpolate(converge, [0,1], [ width*0.25, 0]);
            const tileOpacity = converge;

            return (
              <div style={{ position: 'absolute', inset: 0, padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div
                  style={{
                    transform: `translateX(${leftX}px)`, opacity: tileOpacity,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20
                  }}
                >
                  <div style={{ fontFamily: 'Inter', fontSize: 14, opacity: 0.75, color: 'white' }}>Deploys</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 800, color: 'white', marginTop: 8 }}>128</div>
                </div>
                <div
                  style={{
                    transform: `translateX(${rightX}px)`, opacity: tileOpacity,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20
                  }}
                >
                  <div style={{ fontFamily: 'Inter', fontSize: 14, opacity: 0.75, color: 'white' }}>Latency</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 800, color: 'white', marginTop: 8 }}>142ms</div>
                </div>
              </div>
            );
          })()}

          {/* Unified emphasis card appears after convergence */}
          {(() => {
            const unify = spring({ frame: frame - 170, fps, config: SPRING_GENTLE });
            const upY = interpolate(unify, [0,1], [16, 0]);
            return (
              <div
                style={{
                  position: 'absolute',
                  left: 28, right: 28, bottom: 28, height: 120,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transform: `translateY(${upY}px)`,
                  opacity: unify,
                  display: 'flex', alignItems: 'center', gap: 12, padding: 20
                }}
              >
                <window.IconifyIcon icon="ph:rocket-launch-bold" width={24} height={24} />
                <div style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 800, color: 'white' }}>Shipping Faster than Ever</div>
              </div>
            );
          })()}
        </div>
      </div>
    </AbsoluteFill>
  );
}
```
