// Quick test script to see what AI generates with our new prompts
// Run with: node test-ai-generation.js

async function testAIGeneration() {
  // Simulate the exact prompt we're using
  const systemPrompt = `You are a React/Remotion code generator. Convert JSON specifications into production-ready motion graphics components.

CRITICAL REQUIREMENTS:
1. ALWAYS start with the exact line: const { AbsoluteFill, useCurrentFrame, interpolate, spring } = window.Remotion;
2. Follow with an empty line
3. Then start your export default function ComponentName() 
4. Return ONLY the component code, no markdown or explanations
5. Use inline styles for all styling
6. Ensure all interpolate() calls have matching input/output array lengths
7. Never include import statements - use the window.Remotion destructuring instead

EXACT Component template structure - follow this format precisely:
\`\`\`tsx
const { AbsoluteFill, useCurrentFrame, interpolate, spring } = window.Remotion;

export default function ComponentName() {
  const frame = useCurrentFrame();
  
  // Implement animations based on motion spec
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill style={{
      backgroundColor: 'spec.styling.background',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Implement component based on spec */}
    </AbsoluteFill>
  );
}
\`\`\`

The first line MUST be exactly: const { AbsoluteFill, useCurrentFrame, interpolate, spring } = window.Remotion;`;

  const sceneSpec = {
    "component": {
      "name": "Default Hero Section",
      "layout": "Full-width hero with a headline, subheading, and call-to-action button"
    },
    "styling": {
      "font": "Inter",
      "radius": "15px",
      "palette": "tech",
      "background": "#000000",
      "textColor": "#FFFFFF"
    },
    "text": {
      "headline": "Transform Your Financial Future",
      "subheading": "Empowering you to make smarter financial decisions."
    },
    "motion": {
      "type": "zoom",
      "durationInFrames": 120,
      "easing": "easeInOut"
    }
  };

  const userPrompt = `Generate a React/Remotion component from this specification:

${JSON.stringify(sceneSpec, null, 2)}

Component name: TestFinanceHero

Create engaging, smooth animations that match the motion specification exactly.`;

  console.log('=== TESTING AI GENERATION ===');
  console.log('System Prompt:', systemPrompt.substring(0, 200) + '...');
  console.log('User Prompt:', userPrompt.substring(0, 200) + '...');
  console.log('\n=== EXPECTED OUTPUT ===');
  console.log('Should start with: const { AbsoluteFill, useCurrentFrame, interpolate, spring } = window.Remotion;');
  console.log('Should have no import statements');
  console.log('Should be a complete React component');
  
  console.log('\n=== MANUAL VERIFICATION NEEDED ===');
  console.log('1. Copy the system prompt and user prompt above');
  console.log('2. Test them in ChatGPT/Claude to see what gets generated');
  console.log('3. Check if the output starts with the correct destructuring line');
  console.log('4. Look for any duplicate AbsoluteFill declarations');
}

testAIGeneration(); 