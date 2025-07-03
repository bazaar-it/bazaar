export function generateCleanFilename(
  projectTitle: string, 
  quality: string,
  fileFormat: 'mp4' | 'webm' | 'gif' = 'mp4'
): string {
  // Sanitize project title
  const sanitized = projectTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing dashes
    .substring(0, 30);            // Limit length to keep filename reasonable
  
  // Format: projectname-quality.format
  // Simpler format to avoid "virus-like" appearance
  const filename = `${sanitized}-${quality}.${fileFormat}`;
  
  return filename;
}

// Examples:
// "My Awesome Video!" → "my-awesome-video-1080p.mp4"
// "Product Demo #1" → "product-demo-1-720p.mp4"
// "🎉 Party Invite 🎉" → "party-invite-480p.mp4"