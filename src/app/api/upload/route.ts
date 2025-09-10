import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { auth } from '~/server/auth';
import { assetContext, AssetContextService } from '~/server/services/context/assetContextService';
import type { Asset } from '~/lib/types/asset-context';
import crypto from 'crypto';

// Configure the route to accept larger uploads (100MB)
export const runtime = 'nodejs';
export const maxDuration = 30;

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
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/') || file.name.endsWith('.mp3');
    
    if (!isImage && !isVideo && !isAudio) {
      return NextResponse.json({ error: 'Only image, video, and audio files are allowed' }, { status: 400 });
    }

    // Validate file size (10MB for images, 100MB for videos, 50MB for audio)
    const maxSize = isVideo ? 100 * 1024 * 1024 : isAudio ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large (max ${isVideo ? '100MB' : isAudio ? '50MB' : '10MB'})` 
      }, { status: 400 });
    }

    console.log(`[Upload] Processing ${isVideo ? 'video' : isAudio ? 'audio' : 'image'} upload:`, {
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
    const mediaType = isVideo ? 'videos' : isAudio ? 'audio' : 'images';
    const uniqueKey = `projects/${projectId}/${mediaType}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

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

    console.log(`[Upload] ✅ ${isVideo ? 'Video' : isAudio ? 'Audio' : 'Image'} uploaded successfully:`, {
      originalName: file.name,
      uniqueKey,
      publicUrl: publicUrl.substring(0, 100) + '...',
      fileSize: file.size
    });

    // Save asset to project memory for persistent context
    try {
      // Calculate file hash for deduplication
      const hashSum = crypto.createHash('sha256');
      hashSum.update(buffer);
      const fileHash = hashSum.digest('hex').substring(0, 16);
      
      // Determine asset type
      let assetType: Asset['type'] = 'image';
      if (isVideo) assetType = 'video';
      else if (isAudio) assetType = 'audio';
      else if (AssetContextService.isLikelyLogo(file.name)) assetType = 'logo';
      
      const asset: Asset = {
        id: crypto.randomUUID(),
        url: publicUrl,
        type: assetType,
        fileSize: file.size,
        originalName: file.name,
        hash: fileHash,
        tags: assetType === 'logo' ? ['logo', 'brand'] : [],
        uploadedAt: new Date(),
        usageCount: 0
      };
      
      // Get image dimensions if it's an image
      if (isImage && !isVideo && !isAudio) {
        // Note: Dimensions would be calculated client-side or via a separate service
        // For now, we'll skip dimensions
      }
      
      await assetContext.saveAsset(projectId, asset, {
        isLogo: assetType === 'logo',
        uploadedBy: session.user.id
      });
      
      console.log(`[Upload] 💾 Asset saved to context:`, {
        assetId: asset.id,
        type: asset.type,
        projectId
      });

      // Fire-and-forget: analyze media and tag asset for richer Brain context
      try {
        const { mediaMetadataService } = await import('~/server/services/media/media-metadata.service');
        // run without blocking response
        void mediaMetadataService.analyzeAndTag(asset.id, publicUrl);
      } catch (e) {
        console.warn('[Upload] Media metadata service not available:', e);
      }
    } catch (contextError) {
      // Don't fail the upload if context save fails
      console.error('[Upload] Failed to save asset context:', contextError);
    }

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
