import 'dotenv/config';
import fetch from 'node-fetch';

if (!globalThis.fetch) {
  (globalThis as any).fetch = fetch as any;
}

import { db } from '../src/server/db';
import { templates, templateScenes, users } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';

const TEMPLATE_ID = '8f4e0a64-a4b3-4a0c-9da0-0df5d2b94803';
const SCENE_IDS = [
  '7a5a5f12-4d46-451f-b805-9a50b9b8bc5a',
  '1c9f8d42-0427-4c83-8743-d62e9dcb015d',
  '2b03f1db-44b6-4d21-940c-0ef6ff2a60c9',
  '8909f1ce-5697-4f2d-a965-49e84b3d3e78',
];

const heroSceneTsx = String.raw`import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const TemplateScene = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1f2937 55%, #0ea5e9 100%)",
        color: "white",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
        justifyContent: "center",
          alignItems: "center",
          gap: 28,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: 700,
            letterSpacing: -1,
            opacity: titleOpacity,
          }}
        >
          OrbitFlow Launch Story
        </div>
        <div
          style={{
            fontSize: 26,
            opacity: subtitleOpacity,
            maxWidth: 960,
          }}
        >
          We help growing teams orchestrate operations with guided automations, personalized to every customer journey.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

TemplateScene.defaultProps = {};

export default TemplateScene;
`;

const problemSceneTsx = String.raw`import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const TemplateScene = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const translateY = 20 - reveal * 20;

  const bulletStyle = {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    fontSize: 22,
    lineHeight: 1.4,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        color: "white",
        fontFamily: "Inter, sans-serif",
        padding: "96px 140px",
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: 600,
          marginBottom: 28,
          opacity: reveal,
          transform: \`translateY(\${translateY}px)\`,
        }}
      >
        The manual ops grind
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          opacity: reveal,
          transform: \`translateY(\${translateY}px)\`,
        }}
      >
        <div style={bulletStyle}>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>01</span>
          <span>Playbooks live in docs nobody updates, so onboarding new teammates takes weeks.</span>
        </div>
        <div style={bulletStyle}>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>02</span>
          <span>Customers fall through the cracks because your CRM and support tools never stay in sync.</span>
        </div>
        <div style={bulletStyle}>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>03</span>
          <span>Leaders lack a live picture of the journey, so forecasting and QA feel like guessing.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

TemplateScene.defaultProps = {};

export default TemplateScene;
`;

const solutionSceneTsx = String.raw`import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const TemplateScene = () => {
  const frame = useCurrentFrame();
  const cardOpacity = interpolate(frame, [8, 28], [0, 1], { extrapolateRight: "clamp" });
  const highlight = interpolate(frame, [28, 50], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#e0f2fe",
        color: "#0f172a",
        fontFamily: "Inter, sans-serif",
        padding: "80px 120px",
      }}
    >
      <div style={{ fontSize: 46, fontWeight: 700, marginBottom: 32 }}>
        Automations that feel human
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 28,
            padding: 32,
            boxShadow: "0 32px 60px rgba(15, 23, 42, 0.08)",
            opacity: cardOpacity,
            transition: "opacity 0.6s ease"
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Guided service boards</div>
          <p style={{ fontSize: 18, lineHeight: 1.5 }}>
            Every customer journey becomes a visual storyboard with tasks, owners, due dates, and playbooks surfaced automatically.
          </p>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              fontSize: 16,
            }}
          >
            <span>• Drag-and-drop automations</span>
            <span>• Per-customer health scoring</span>
            <span>• AI draft replies in your tone</span>
          </div>
        </div>
        <div
          style={{
            borderRadius: 28,
            padding: 32,
            background: "linear-gradient(180deg, rgba(14,165,233,0.12) 0%, rgba(14,165,233,0) 100%)",
            border: "1px solid rgba(14,165,233,0.35)",
            opacity: highlight,
            transition: "opacity 0.6s ease"
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Side-by-side execution</div>
          <p style={{ fontSize: 18, lineHeight: 1.6 }}>
            Ops leaders orchestrate campaigns, CS sees live context, RevOps syncs targets—all in one canvas.
          </p>
          <div style={{ marginTop: 24, fontSize: 16, lineHeight: 1.5 }}>
            “OrbitFlow cut our onboarding time by 43% in the first month.”
            <br />
            <span style={{ color: '#0369a1' }}>— Priya, COO @ SignalFlux</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

TemplateScene.defaultProps = {};

export default TemplateScene;
`;

const ctaSceneTsx = String.raw`import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const TemplateScene = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.25), transparent 60%), #0f172a",
        color: "white",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          opacity,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 700 }}>See OrbitFlow in action</div>
        <div style={{ fontSize: 22, opacity: 0.8, maxWidth: 720 }}>
          Launch your first personalized automation in under an hour—no engineering sprint, no copy-paste playbooks.
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div
            style={{
              backgroundColor: "#38bdf8",
              color: "#0f172a",
              fontWeight: 600,
              padding: "14px 36px",
              borderRadius: 999,
              fontSize: 18,
            }}
          >
            Book live demo
          </div>
          <div
            style={{
              border: "1px solid rgba(148, 163, 184, 0.6)",
              padding: "14px 32px",
              borderRadius: 999,
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            Download story deck
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

TemplateScene.defaultProps = {};

export default TemplateScene;
`;

const SCENES = [
  { id: SCENE_IDS[0], name: '01 - Launch Hero', duration: 150, tsxCode: heroSceneTsx },
  { id: SCENE_IDS[1], name: '02 - Problem Framing', duration: 150, tsxCode: problemSceneTsx },
  { id: SCENE_IDS[2], name: '03 - Solution Walkthrough', duration: 150, tsxCode: solutionSceneTsx },
  { id: SCENE_IDS[3], name: '04 - CTA + Social Proof', duration: 150, tsxCode: ctaSceneTsx },
];

async function main() {
  const admin = await db.query.users.findFirst({
    where: (usersTable, { eq }) => eq(usersTable.isAdmin, true),
    columns: { id: true },
  });

  if (!admin) {
    throw new Error('No admin user found. Please create an admin before seeding.');
  }

  const existing = await db.query.templates.findFirst({
    where: eq(templates.id, TEMPLATE_ID),
  });

  if (existing) {
    console.log('ℹ️  Existing template found. Replacing...');
    await db.delete(templateScenes).where(eq(templateScenes.templateId, existing.id));
    await db.delete(templates).where(eq(templates.id, existing.id));
  }

  const totalDuration = SCENES.reduce((sum, scene) => sum + scene.duration, 0);

  const [templateRow] = await db.insert(templates).values({
    id: TEMPLATE_ID,
    name: 'OrbitFlow 4-scene Launch',
    description: 'Admin-only demo template that showcases a full product story in four scenes.',
    tsxCode: SCENES[0].tsxCode,
    duration: SCENES[0].duration,
    supportedFormats: ['landscape'],
    tags: ['admin-demo', 'multi-scene', 'launch'],
    category: 'business',
    isActive: true,
    isOfficial: true,
    adminOnly: true,
    sceneCount: SCENES.length,
    totalDuration,
    createdBy: admin.id,
    thumbnailUrl: null,
    sourceProjectId: null,
    sourceSceneId: null,
  }).returning();

  for (const [index, scene] of SCENES.entries()) {
    await db.insert(templateScenes).values({
      id: scene.id,
      templateId: templateRow.id,
      name: scene.name,
      order: index,
      duration: scene.duration,
      tsxCode: scene.tsxCode,
      jsCode: null,
      jsCompiledAt: null,
      compilationError: null,
    });
  }

  console.log('✅ Seeded admin-only multi-scene template (OrbitFlow 4-scene Launch).');
}

main()
  .catch((error) => {
    console.error('❌ Failed to seed multi-scene template');
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
