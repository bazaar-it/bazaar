/**
 * Test if GPT-4.1-mini can actually see R2 URLs
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testVision() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Test with a known R2 URL from your extraction
  const testUrl = 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/web-analysis/extraction-lab/1756126808751-afbcb893-extraction/1756126808751_hero.png';

  console.log('🧪 Testing GPT-4.1-mini vision with R2 URL...');
  console.log('URL:', testUrl);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'What company/brand is shown in this screenshot? What is the main headline text visible? Please describe what you see.' 
            },
            { 
              type: 'image_url', 
              image_url: { 
                url: testUrl,
                detail: 'high'
              } 
            }
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    console.log('\n📝 Response:', content);
    
    if (content?.toLowerCase().includes('ramp')) {
      console.log('✅ SUCCESS: Model can see R2 URLs and identified Ramp!');
    } else {
      console.log('❌ PROBLEM: Model cannot see the image or identify the brand');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testVision().catch(console.error);