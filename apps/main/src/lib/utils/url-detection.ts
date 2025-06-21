/**
 * Utility functions for detecting and validating URLs in text
 */

/**
 * Extract URLs from text using regex
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  
  // Clean up URLs (remove trailing punctuation)
  return matches.map(url => {
    return url.replace(/[.,;!?)+]+$/, '');
  });
}

/**
 * Check if a URL is valid and web-accessible
 */
export function isValidWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Extract the first valid URL from text
 */
export function extractFirstValidUrl(text: string): string | null {
  const urls = extractUrls(text);
  const validUrls = urls.filter(isValidWebUrl);
  return validUrls.length > 0 ? validUrls[0] : null;
}

/**
 * Check if text contains any URLs
 */
export function containsUrl(text: string): boolean {
  return extractUrls(text).length > 0;
}

/**
 * Get domain from URL
 */
export function getDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Normalize URL (add https if missing)
 */
export function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/**
 * Test function to verify URL detection works correctly
 */
export function testUrlDetection(): void {
  const testCases = [
    "Check out https://stripe.com for payments",
    "Our site is https://figma.com.",
    "Visit http://example.com and https://google.com",
    "No URLs here!",
    "Multiple: https://a.com, https://b.com, and https://c.com",
    "Create a video for our company: https://notion.so/about",
    "Check this out: https://github.com/microsoft/playwright!",
    "Pricing at https://vercel.com/pricing?utm_source=example",
    "Mixed: Visit our site www.example.com or https://example.com/contact"
  ];
  
  console.log('🧪 Testing URL Detection:');
  testCases.forEach((text, index) => {
    const urls = extractUrls(text);
    const validUrls = urls.filter(isValidWebUrl);
    const firstValid = extractFirstValidUrl(text);
    
    console.log(`\n${index + 1}. "${text}"`);
    console.log(`   Found URLs: ${JSON.stringify(urls)}`);
    console.log(`   Valid URLs: ${JSON.stringify(validUrls)}`);
    console.log(`   First Valid: ${firstValid}`);
    console.log(`   Contains URL: ${containsUrl(text)}`);
  });
  
  // Test domain extraction
  console.log('\n🌐 Testing Domain Extraction:');
  const domainTests = [
    'https://stripe.com/pricing',
    'http://www.example.com',
    'https://subdomain.example.co.uk/path',
    'invalid-url'
  ];
  
  domainTests.forEach(url => {
    const domain = getDomain(url);
    console.log(`   ${url} → ${domain}`);
  });
  
  // Test URL normalization
  console.log('\n🔧 Testing URL Normalization:');
  const normalizeTests = [
    'stripe.com',
    'https://figma.com',
    'http://example.com',
    'www.github.com'
  ];
  
  normalizeTests.forEach(url => {
    const normalized = normalizeUrl(url);
    console.log(`   ${url} → ${normalized}`);
  });
}