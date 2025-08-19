// scripts/sync-fonts-from-r2.ts
import {S3Client, GetObjectCommand, ListObjectsV2Command} from '@aws-sdk/client-s3';
import {createWriteStream, existsSync, mkdirSync, readdirSync, rmSync} from 'fs';
import {resolve, dirname} from 'path';
import {pipeline} from 'stream';
import {promisify} from 'util';
import {FONT_CATALOG} from '../src/remotion/fonts/catalog';
import { config as dotenvConfig } from 'dotenv';

const streamPipeline = promisify(pipeline);

async function main() {
  // Load env from .env.local (preferred) then .env
  dotenvConfig({ path: resolve(process.cwd(), '.env.local') });
  dotenvConfig({ path: resolve(process.cwd(), '.env') });

  const prune = process.argv.includes('--prune');
  const bucket = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const prefix = (process.env.R2_FONTS_PREFIX || 'fonts/').replace(/^\/+|\/+$|^$/g, '') + '/';

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    console.error('[fonts:sync] Missing R2 env vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
    process.exit(1);
  }

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {accessKeyId, secretAccessKey},
  });

  // Build required filename set from catalog
  const required = new Set<string>();
  for (const family of Object.keys(FONT_CATALOG)) {
    const weights = FONT_CATALOG[family]!;
    for (const file of Object.values(weights)) {
      required.add(file);
    }
  }

  const outDir = resolve(process.cwd(), 'public', 'fonts');
  if (!existsSync(outDir)) mkdirSync(outDir, {recursive: true});

  console.log(`[fonts:sync] Required fonts: ${required.size}`);

  // List available objects in R2 at the prefix
  const listed = await client.send(new ListObjectsV2Command({Bucket: bucket, Prefix: prefix}));
  const available = new Map<string, string>(); // filename -> key
  for (const obj of listed.Contents ?? []) {
    if (!obj.Key) continue;
    const key = obj.Key;
    const name = key.split('/').pop()!;
    available.set(name, key);
  }

  // Download missing required fonts
  let downloaded = 0;
  for (const file of required) {
    const dest = resolve(outDir, file);
    if (existsSync(dest)) continue;
    const key = available.get(file) ?? `${prefix}${file}`; // try exact file at prefix
    console.log(`[fonts:sync] Downloading ${key} -> ${dest}`);
    const res = await client.send(new GetObjectCommand({Bucket: bucket, Key: key}));
    // @ts-ignore - Body is a stream
    const bodyStream = res.Body as NodeJS.ReadableStream;
    await streamPipeline(bodyStream, createWriteStream(dest));
    downloaded++;
  }

  // Optionally prune extra local fonts not in catalog
  let pruned = 0;
  if (prune) {
    const local = readdirSync(outDir).filter((f) => f.endsWith('.woff2'));
    for (const f of local) {
      if (!required.has(f)) {
        const p = resolve(outDir, f);
        rmSync(p);
        pruned++;
        console.log(`[fonts:sync] Pruned ${f}`);
      }
    }
  }

  console.log(`[fonts:sync] Done. Downloaded ${downloaded}${prune ? `, pruned ${pruned}` : ''}. Output dir: ${outDir}`);
}

main().catch((err) => {
  console.error('[fonts:sync] Failed:', err);
  process.exit(1);
});
