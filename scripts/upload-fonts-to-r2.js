#!/usr/bin/env node

/**
 * Script to upload WOFF2 font files to Cloudflare R2
 * Run: node scripts/upload-fonts-to-r2.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// R2 configuration
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

// Extract account ID from endpoint if not directly provided
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || 
  (R2_ENDPOINT ? R2_ENDPOINT.match(/https:\/\/([^.]+)/)?.[1] : null);

// Check required environment variables
if (!R2_BUCKET || !R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing required R2 environment variables');
  console.error('Please ensure the following are set in .env.local:');
  console.error('- CLOUDFLARE_R2_BUCKET_NAME');
  console.error('- CLOUDFLARE_R2_ENDPOINT');
  console.error('- CLOUDFLARE_R2_ACCESS_KEY_ID');
  console.error('- CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Font directory
const FONT_DIR = path.join(__dirname, '..', 'public', 'fonts');

/**
 * Upload a single font file to R2
 */
async function uploadFont(filePath, key) {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: fileContent,
      ContentType: 'font/woff2',
      // Set cache control for fonts (1 year)
      CacheControl: 'public, max-age=31536000, immutable',
      // Allow CORS
      Metadata: {
        'Access-Control-Allow-Origin': '*',
      },
    });
    
    await s3Client.send(command);
    console.log(`✅ Uploaded: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${key}: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting font upload to R2...\n');
  console.log(`📦 Bucket: ${R2_BUCKET}`);
  console.log(`📁 Source: ${FONT_DIR}\n`);
  
  // Check if font directory exists
  if (!fs.existsSync(FONT_DIR)) {
    console.error(`❌ Font directory not found: ${FONT_DIR}`);
    console.error('Please run "node scripts/download-fonts.js" first');
    process.exit(1);
  }
  
  // Get all WOFF2 files
  const fontFiles = fs.readdirSync(FONT_DIR).filter(f => f.endsWith('.woff2'));
  
  if (fontFiles.length === 0) {
    console.error('❌ No WOFF2 files found in font directory');
    console.error('Please run "node scripts/download-fonts.js" first');
    process.exit(1);
  }
  
  console.log(`📊 Found ${fontFiles.length} font files to upload\n`);
  
  let totalUploaded = 0;
  let totalFailed = 0;
  
  for (const file of fontFiles) {
    const filePath = path.join(FONT_DIR, file);
    const key = `fonts/${file}`; // Upload to fonts/ directory in R2
    
    const success = await uploadFont(filePath, key);
    if (success) {
      totalUploaded++;
    } else {
      totalFailed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Uploaded: ${totalUploaded} fonts`);
  console.log(`❌ Failed: ${totalFailed} fonts`);
  console.log('='.repeat(50));
  
  if (totalUploaded > 0) {
    console.log('\n📋 Next steps:');
    console.log('1. Verify R2 public access is enabled');
    console.log('2. Deploy new Lambda site with font loader');
    console.log('3. Test font rendering in exports');
    console.log('\n🔗 Fonts will be available at:');
    console.log(`https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/fonts/[filename].woff2`);
  }
}

// Run the script
main().catch(console.error);