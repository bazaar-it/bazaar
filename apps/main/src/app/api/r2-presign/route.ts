import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { auth } from '@bazaar/auth';
import { z } from 'zod';

const presignRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/i),
  projectId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validation = presignRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { fileName, fileType, projectId } = validation.data;

    // Configure S3 client for Cloudflare R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });

    // Generate unique key with project scoping
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueKey = `projects/${projectId}/images/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    // Create presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: uniqueKey,
      ContentType: fileType,
      // Optional: Add metadata
      Metadata: {
        'uploaded-by': session.user.id,
        'project-id': projectId,
        'original-name': fileName,
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600 // 1 hour
    });

    // Construct public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueKey}`;

    console.log(`[R2Presign] Generated presigned URL for ${fileName} → ${uniqueKey}`);

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      key: uniqueKey,
      expiresIn: 3600,
    });

  } catch (error) {
    console.error('[R2Presign] Error generating presigned URL:', error);
    return NextResponse.json({ 
      error: 'Failed to generate upload URL' 
    }, { status: 500 });
  }
} 