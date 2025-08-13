/**
 * YouTube Data Extraction API
 * Extracts metadata from YouTube URLs for media context
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { mediaContext } from '~/server/services/media/mediaContext.service';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, projectId } = await request.json();
    
    if (!url || !projectId) {
      return NextResponse.json({ error: 'Missing URL or project ID' }, { status: 400 });
    }
    
    // Extract video ID from various YouTube URL formats
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }
    
    // Get video metadata using YouTube oEmbed API (no API key needed)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch YouTube metadata' }, { status: 500 });
    }
    
    const data = await response.json();
    
    // Extract and format metadata
    const youtubeData = {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      title: data.title || 'YouTube Video',
      channel: data.author_name || 'Unknown Channel',
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      // Try different thumbnail qualities
      thumbnails: {
        max: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
      },
      width: data.width || 1920,
      height: data.height || 1080,
    };
    
    // Save to media context
    await mediaContext.saveYouTubeLink(projectId, youtubeData);
    
    console.log('[YouTube Extract] Saved YouTube link to media context:', {
      projectId,
      title: youtubeData.title,
      url: youtubeData.url
    });
    
    return NextResponse.json({
      success: true,
      data: youtubeData
    });
    
  } catch (error) {
    console.error('[YouTube Extract] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to extract YouTube data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Just the ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  
  return null;
}