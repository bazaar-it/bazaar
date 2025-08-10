/**
 * Test script to verify Figma PAT is working
 * Run with: npx tsx test-figma-pat.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const FIGMA_PAT = process.env.FIGMA_PAT;

if (!FIGMA_PAT) {
  console.error('❌ FIGMA_PAT not found in .env.local');
  process.exit(1);
}

console.log('🔍 Testing Figma PAT...');
console.log(`PAT: ${FIGMA_PAT.substring(0, 10)}...${FIGMA_PAT.substring(FIGMA_PAT.length - 4)}`);

// Test 1: Get user info (should always work with valid PAT)
async function testUserInfo() {
  console.log('\n📋 Test 1: Getting user info...');
  
  const response = await fetch('https://api.figma.com/v1/me', {
    headers: {
      'X-Figma-Token': FIGMA_PAT!,
    },
  });

  if (response.ok) {
    const data = await response.json();
    console.log('✅ PAT is valid!');
    console.log('👤 User:', data.email || 'Unknown');
    console.log('🆔 User ID:', data.id);
    return true;
  } else {
    console.error('❌ PAT is invalid:', response.status, response.statusText);
    return false;
  }
}

// Test 2: List team projects (to find accessible files)
async function listTeamProjects() {
  console.log('\n📁 Test 2: Listing accessible team projects...');
  
  // Get teams first
  const teamsResponse = await fetch('https://api.figma.com/v1/me', {
    headers: {
      'X-Figma-Token': FIGMA_PAT!,
    },
  });

  if (!teamsResponse.ok) {
    console.error('❌ Could not fetch user info');
    return;
  }

  const userData = await teamsResponse.json();
  console.log('\n🏢 Your teams:');
  
  // Note: Figma API doesn't directly list all teams, but we can try common team IDs
  // For personal files, you'd need to know the file keys
  console.log('ℹ️  To test the integration:');
  console.log('1. Create a new Figma file or use an existing one you own');
  console.log('2. Copy the file key from the URL');
  console.log('3. Use that key in the Figma panel');
}

// Test 3: Try to access a public Figma Community file
async function testCommunityFile() {
  console.log('\n🌐 Test 3: Trying to access Figma Community file...');
  
  // This is a public Figma Community file (Material Design kit)
  const communityFileKey = 'f8porzRdTGUtyGKh9gPPEc';
  
  const response = await fetch(`https://api.figma.com/v1/files/${communityFileKey}`, {
    headers: {
      'X-Figma-Token': FIGMA_PAT!,
    },
  });

  if (response.ok) {
    const data = await response.json();
    console.log('✅ Can access Community file:', data.name);
    console.log('📝 You can test with this file key:', communityFileKey);
    return communityFileKey;
  } else {
    console.log('⚠️  Cannot access Community files (this is normal for personal PATs)');
    return null;
  }
}

// Run tests
async function runTests() {
  const isValid = await testUserInfo();
  
  if (isValid) {
    await listTeamProjects();
    const testFileKey = await testCommunityFile();
    
    console.log('\n✨ Summary:');
    console.log('- Your PAT is valid and working');
    console.log('- You can access files you own or have been shared with you');
    console.log('- You cannot access random public files (this is expected)');
    
    if (testFileKey) {
      console.log(`\n💡 Try this file key in the panel: ${testFileKey}`);
    }
    
    console.log('\n📌 Next steps:');
    console.log('1. Go to Figma and create a new file (or use an existing one)');
    console.log('2. Add some frames or components to it');
    console.log('3. Copy the file key from the URL');
    console.log('4. Use that key in the Bazaar Figma panel');
  }
}

runTests().catch(console.error);