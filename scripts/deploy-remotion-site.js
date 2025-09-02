#!/usr/bin/env node
/**
 * Deploy Remotion site to AWS Lambda
 * This uploads the Remotion bundle to S3 for Lambda rendering
 */
import { deploySite } from '@remotion/lambda';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deployRemotionSite() {
  console.log('🚀 Starting Remotion site deployment...\n');
  
  // Validate environment
  const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please ensure these are set in your .env.local file');
    process.exit(1);
  }
  
  const bucketName = process.env.REMOTION_BUCKET_NAME || 'remotionlambda-useast1-yb1vzou9i7';
  const region = process.env.AWS_REGION || 'us-east-1';
  
  console.log('📦 Configuration:');
  console.log(`  Bucket: ${bucketName}`);
  console.log(`  Region: ${region}`);
  console.log(`  Entry: src/remotion/index.tsx`);
  
  // Generate site name with timestamp for versioning
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const siteName = `bazaar-icon-robust-${timestamp}`;
  
  console.log(`  Site Name: ${siteName}\n`);
  
  try {
    console.log('📦 Bundling Remotion project...');
    
    const result = await deploySite({
      entryPoint: path.resolve(__dirname, '..', 'src', 'remotion', 'index.tsx'),
      bucketName,
      region,
      siteName,
      options: {
        onBundleProgress: (progress) => {
          // Clear line and update progress
          process.stdout.write(`\r  Bundling: ${Math.round(progress * 100)}%`);
        },
        onUploadProgress: (progress) => {
          const percent = Math.round((progress.uploadedBytes / progress.totalBytes) * 100);
          process.stdout.write(`\r  Uploading: ${percent}% (${progress.uploadedFiles}/${progress.totalFiles} files)`);
        }
      }
    });
    
    console.log('\n\n✅ Site deployed successfully!\n');
    console.log('📌 Deployment Details:');
    console.log(`  Serve URL: ${result.serveUrl}`);
    console.log(`  Site ID: ${result.siteName}`);
    console.log('');
    console.log('📝 Next Steps:');
    console.log('1. Update REMOTION_SERVE_URL in .env.local to:');
    console.log(`   ${result.serveUrl}`);
    console.log('');
    console.log('2. Restart your development server to use the new site');
    console.log('');
    console.log('3. Test an export to verify the deployment works');
    
    // Write URL to file for easy copying
    const fs = await import('fs');
    const urlFile = path.join(__dirname, '..', 'REMOTION_SERVE_URL.txt');
    fs.writeFileSync(urlFile, result.serveUrl);
    console.log(`\n💾 URL saved to: ${urlFile}`);
    
    return result;
  } catch (error) {
    console.error('\n\n❌ Deployment failed:', error.message);
    
    if (error.message.includes('credentials')) {
      console.error('\n🔑 AWS credentials issue detected.');
      console.error('Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    } else if (error.message.includes('bucket')) {
      console.error('\n🪣 S3 bucket issue detected.');
      console.error('Please verify the bucket exists and you have permissions');
    }
    
    process.exit(1);
  }
}

// Run deployment
deployRemotionSite().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});