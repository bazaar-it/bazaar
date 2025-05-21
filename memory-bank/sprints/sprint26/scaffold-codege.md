

1 · Component Generator (scaffold)

src/services/componentGenerator.service.ts

import { callLLM } from "@/services/shared/llm";
import { Storyboard, Scene } from "@/schema/storyboard-types";
import { buildWithEsbuild } from "@/services/builder/buildWorker";
import { uploadModule } from "@/services/storage/r2Client";
import { logger } from "@/services/shared/logger";

type GenResult = {
  sceneId: string;
  moduleUrl: string;         // public R2 URL
  durationInFrames: number;  // returned by build-time analysis
  sourceMapUrl: string;
};

export async function generateComponentForScene(
  storyboard: Storyboard,
  scene: Scene,
): Promise<GenResult> {
  /* 1. craft prompt specialised for code LLM ------------------- */
  const prompt = `
You are a Remotion code assistant. 
Write a React (Remotion) component for the browser Player.

Rules:
– Import ONLY from "remotion" or "remotion/<subpath>".
– Do NOT import React; assume window.React is present.
– Export your component as default.
– fps = ${storyboard.fps}, width = ${storyboard.width}, height = ${storyboard.height}.
– You may use the following design tokens: ${JSON.stringify(storyboard.designSystem)}
– Scene description:
${JSON.stringify(scene.props, null, 2)}
`;

  const llmResp = await callLLM("claude-3-sonnet", prompt, { temperature:0.3 });
  const tsxCode = llmResp.trim();

  /* 2. build with esbuild + external-global -------------------- */
  const buildResult = await buildWithEsbuild(tsxCode);

  /* buildResult = { bundle:string, map:string, durationFrames:number } */

  /* 3. upload to R2 ------------------------------------------- */
  const [bundleUrl, mapUrl] = await Promise.all([
    uploadModule(buildResult.bundle, "text/javascript"),
    uploadModule(buildResult.map,    "application/json")
  ]);

  logger.info("Component built", { sceneId:scene.id, url:bundleUrl });

  return {
    sceneId: scene.id,
    moduleUrl: bundleUrl,
    sourceMapUrl: mapUrl,
    durationInFrames: buildResult.durationFrames ?? scene.duration,
  };
}


⸻

2 · Build Worker (esbuild + external-global)

src/services/builder/buildWorker.ts

import { build } from "esbuild";
import { externalGlobalPlugin } from "esbuild-plugin-external-global";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "crypto";

export async function buildWithEsbuild(tsx: string) {
  /* write TSX to temp file (esbuild still needs a path input) */
  const tmpFile = path.join(tmpdir(), `scene-${randomUUID()}.tsx`);
  await fs.writeFile(tmpFile, tsx, "utf8");

  const result = await build({
    entryPoints: [tmpFile],
    bundle: true,
    format: "esm",
    platform: "browser",
    sourcemap: "external",
    write: false,
    minify: true,
    plugins: [
      externalGlobalPlugin({
        react: "window.React",
        "react-dom": "window.ReactDOM",
        "react/jsx-runtime": "window.ReactJSX",
        remotion: "window.Remotion",
        "remotion/*": "window.Remotion",
      }),
    ],
    define: { "process.env.NODE_ENV": '"production"' },
  });

  /* cleanup */
  await fs.unlink(tmpFile);

  const bundle      = result.outputFiles.find(f => f.path.endsWith(".js"))!.text;
  const sourceMap   = result.outputFiles.find(f => f.path.endsWith(".js.map"))!.text;

  /* Optional: quick regex to read duration if LLM encoded it in a const */
  const durationMatch = bundle.match(/const\s+_DURATION_IN_FRAMES\s*=\s*(\d+)/);
  const durationFrames = durationMatch ? Number(durationMatch[1]) : undefined;

  return { bundle, map: sourceMap, durationFrames };
}


⸻

3 · Tiny R2 uploader

src/services/storage/r2Client.ts

import { R2Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const r2 = new R2Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_KEY!,
    secretAccessKey: process.env.R2_SECRET!,
  },
});

export async function uploadModule(body: string, contentType: string) {
  const key = `modules/${randomUUID()}.mjs`;
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: "public-read",           // public fetch
    CacheControl: "max-age=31536000, immutable",
  }));
  return `${process.env.R2_PUBLIC_BASE}/${key}`;
}


⸻

4 · Expose globals once in _app.tsx

// _app.tsx  (Next.js)
import { useEffect } from "react";
import * as Remotion from "remotion";
import React from "react";
import ReactDOM from "react-dom";

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    (window as any).React      = React;
    (window as any).ReactDOM   = ReactDOM;
    import("react/jsx-runtime").then((jsx) => {
      (window as any).ReactJSX = jsx;
    });
    (window as any).Remotion   = Remotion;
  }, []);

  return <Component {...pageProps} />;
}


⸻

5 · CI guard (bundle + React dup)

# .github/workflows/bundle-check.yml
- name: Check bundle size / duplicates
  run: |
    size=$(wc -c < dist/modules/*.mjs)
    if [ "$size" -gt 120000 ]; then
      echo "::error title=Bundle too big::${size} bytes > 120 kB"
      exit 1
    fi
    if grep -q "react.production.min.js" dist/modules/*.mjs; then
      echo "::error title=React dup detected::React bundled inside module"
      exit 1
    fi


⸻

6 · How it all clicks together
	1.	Prompt Orchestrator decides which scene needs a component → calls generateComponentForScene.
	2.	Component Generator prompts the Code-LLM, passes TSX to Build Worker, uploads .mjs via R2 helper.
	3.	Orchestrator patches the Storyboard with the new moduleUrl, then emits tool_result over the chat stream.
	4.	Front-end receives the event, tells <Player> to lazyComponent={() => import(url)} → clip appears.

At this point every missing scaffold is either tiny plumbing (R2 helper) or already generated (agents, chat stream, validator).
Finish wiring PromptOrchestrator.processUserMessage so it calls the new services, add the CI check, and the pipeline is live.