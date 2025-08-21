import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

/**
 * Upload web analysis screenshots to R2
 * Handles both old format (object with desktop/mobile) and new format (Buffer)
 */
export async function uploadWebAnalysisScreenshots(
  screenshots: { desktop: Buffer; mobile: Buffer } | Buffer,
  projectId: string,
  fileType?: string
): Promise<{ desktop: string; mobile: string } | string> {
  // Handle single buffer (new V2 format)
  if (Buffer.isBuffer(screenshots)) {
    return uploadScreenshotToR2(screenshots, fileType || 'screenshot.png', projectId);
  }
  
  // Handle old format with desktop/mobile
  const [desktopUrl, mobileUrl] = await Promise.all([
    uploadScreenshotToR2(screenshots.desktop, 'desktop.png', projectId),
    uploadScreenshotToR2(screenshots.mobile, 'mobile.png', projectId),
  ]);

  return {
    desktop: desktopUrl,
    mobile: mobileUrl,
  };
}

/**
 * Upload screenshot buffer to Cloudflare R2 storage
 */
export async function uploadScreenshotToR2(
  buffer: Buffer,
  fileName: string,
  projectId: string,
  userId?: string
): Promise<string> {
  // Validate buffer
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error(`Invalid buffer provided for ${fileName}`);
  }
  
  // Configure S3 client for Cloudflare R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });

  // Generate unique key for web analysis screenshots
  const timestamp = Date.now();
  const randomId = crypto.randomUUID().slice(0, 8);
  const uniqueKey = `web-analysis/${projectId}/${timestamp}-${randomId}-${fileName}`;

  // Upload screenshot to R2
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: uniqueKey,
    Body: buffer,
    ContentType: 'image/png',
    Metadata: {
      'type': 'web-analysis-screenshot',
      'project-id': projectId,
      'uploaded-by': userId || 'system',
      'created-at': new Date().toISOString(),
    },
  });

  await s3Client.send(command);

  // Construct public URL
  const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueKey}`;

  console.log(`📸 Screenshot uploaded to R2: ${fileName} (${buffer?.length || 0} bytes)`);
  
  return publicUrl;
}

