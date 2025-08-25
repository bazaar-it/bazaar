/**
 * Setup CORS for R2 bucket to allow OpenAI access
 */

import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function setupCORS() {
  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    },
  });

  const corsConfig = {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'HEAD'],
        AllowedOrigins: ['*'], // Allow all origins including OpenAI
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      },
    ],
  };

  try {
    console.log('🔧 Setting up CORS for R2 bucket...');
    
    const command = new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME,
      CORSConfiguration: corsConfig,
    });

    await client.send(command);
    console.log('✅ CORS configuration applied successfully!');
    
    console.log('\n📝 Next steps:');
    console.log('1. Go to Cloudflare Dashboard > R2');
    console.log('2. Select your bucket');
    console.log('3. Go to Settings > Public Access');
    console.log('4. Enable "Public access" for the bucket');
    console.log('5. Your R2 URLs should now be accessible to OpenAI');
    
  } catch (error) {
    console.error('❌ Error setting CORS:', error);
  }
}

setupCORS().catch(console.error);