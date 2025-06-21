import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { auth } from '@bazaar/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    console.log(`[Upload] Processing image upload:`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      projectId,
      userId: session.user.id
    });

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
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const uniqueKey = `projects/${projectId}/images/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    // Convert file to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload file directly to R2
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: uniqueKey,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        'uploaded-by': session.user.id,
        'project-id': projectId,
        'original-name': file.name,
      },
    });

    await s3Client.send(command);

    // Construct public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueKey}`;

    console.log(`[Upload] ✅ Image uploaded successfully:`, {
      originalName: file.name,
      uniqueKey,
      publicUrl: publicUrl.substring(0, 100) + '...',
      fileSize: file.size
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key: uniqueKey,
      size: file.size,
      type: file.type,
      originalName: file.name,
    });

  } catch (error) {
    console.error('[Upload] Error uploading file:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 