#!/usr/bin/env node

// Script to check if export functionality is properly configured

console.log('🔍 Checking Bazaar-Vid Export Configuration...\n');

const requiredVars = {
  'RENDER_MODE': 'Should be set to "lambda" to enable export',
  'AWS_REGION': 'AWS region where Lambda is deployed (e.g., us-east-1)',
  'REMOTION_FUNCTION_NAME': 'Name of the deployed Remotion Lambda function',
  'REMOTION_BUCKET_NAME': 'S3 bucket name for Remotion renders',
};

const optionalVars = {
  'USER_DAILY_EXPORT_LIMIT': 'Daily export limit per user (default: 10)',
  'MAX_RENDER_DURATION_MINUTES': 'Maximum video duration in minutes (default: 30)',
  'WEBHOOK_SECRET': 'Secret for webhook authentication',
};

let allGood = true;

console.log('Required Environment Variables:');
console.log('==============================');
for (const [varName, description] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`❌ ${varName}: NOT SET - ${description}`);
    allGood = false;
  }
}

console.log('\nOptional Environment Variables:');
console.log('==============================');
for (const [varName, description] of Object.entries(optionalVars)) {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: Not set - ${description}`);
  }
}

if (allGood) {
  console.log('\n✅ Export functionality is properly configured!');
  console.log('   Users should be able to export videos using the Export button.');
} else {
  console.log('\n❌ Export functionality is NOT properly configured.');
  console.log('   Please set the missing environment variables.');
  console.log('\n📖 See docs/EXPORT_SETUP.md for detailed setup instructions.');
}

// Check if Lambda is enabled
if (process.env.RENDER_MODE === 'lambda') {
  console.log('\n🚀 Lambda rendering is ENABLED');
} else {
  console.log('\n⚠️  Lambda rendering is DISABLED');
  console.log('   Export will show error: "Video export is not enabled"');
}

process.exit(allGood ? 0 : 1);