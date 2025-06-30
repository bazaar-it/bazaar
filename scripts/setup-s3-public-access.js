#!/usr/bin/env node

/**
 * Script to configure S3 bucket for public access
 * This ensures that rendered videos can be accessed directly
 */

import { S3Client, PutBucketPolicyCommand, PutBucketCorsCommand, GetBucketPolicyCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function setupS3PublicAccess() {
  const bucketName = process.env.REMOTION_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
    console.error('❌ Missing required environment variables: REMOTION_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  console.log(`📦 Configuring S3 bucket: ${bucketName}`);

  // 1. Set bucket policy for public read access on renders
  const bucketPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${bucketName}/renders/*`,
      },
    ],
  };

  try {
    // Check existing policy first
    try {
      const getCommand = new GetBucketPolicyCommand({ Bucket: bucketName });
      const existingPolicy = await s3Client.send(getCommand);
      console.log('📋 Existing bucket policy found:', existingPolicy.Policy);
    } catch (error) {
      const errorName = error?.name || '';
      if (errorName === 'NoSuchBucketPolicy') {
        console.log('📋 No existing bucket policy found');
      }
    }

    const putPolicyCommand = new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy),
    });

    await s3Client.send(putPolicyCommand);
    console.log('✅ Bucket policy set for public read access on renders/*');
  } catch (error) {
    const errorMessage = error?.message || String(error);
    console.error('❌ Failed to set bucket policy:', errorMessage);
    console.error('Make sure your AWS credentials have s3:PutBucketPolicy permission');
    process.exit(1);
  }

  // 2. Set CORS configuration
  const corsConfig = {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'HEAD'],
        AllowedOrigins: ['*'],
        ExposeHeaders: ['Content-Length', 'Content-Type'],
        MaxAgeSeconds: 3000,
      },
    ],
  };

  try {
    const putCorsCommand = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfig,
    });

    await s3Client.send(putCorsCommand);
    console.log('✅ CORS configuration set for cross-origin access');
  } catch (error) {
    const errorMessage = error?.message || String(error);
    console.error('❌ Failed to set CORS configuration:', errorMessage);
    console.error('Make sure your AWS credentials have s3:PutBucketCORS permission');
    process.exit(1);
  }

  console.log('\n🎉 S3 bucket configured successfully!');
  console.log(`📺 Videos rendered to ${bucketName}/renders/* will now be publicly accessible`);
  console.log('\nNOTE: It may take a few minutes for the changes to propagate.');
}

// Run the setup
setupS3PublicAccess().catch(console.error);