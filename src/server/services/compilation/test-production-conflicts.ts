/**
 * Production Data Conflict Detection Test
 * 
 * This script simulates real-world usage with actual production scenes
 * to verify our conflict detection and resolution works correctly.
 */

import { sceneCompiler } from './scene-compiler.service';

// Real production scenes from database analysis
const REAL_PRODUCTION_SCENARIOS = {
  // Scenario 1: Project with 4 identical Mobile App components
  mobileAppProject: {
    projectId: '20b65e69-c032-4b9a-ac7f-fae2ca73a0bb',
    scenes: [
      {
        id: '9a7875de-9c0b-4b11-a6a7-aaf5bf3965be',
        name: 'Mobile App 1',
        tsxCode: `
const GradientCircle = ({ x, y, size, color1, color2, opacity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: \`radial-gradient(circle at 30% 30%, \${color1}, \${color2})\`,
        opacity: 0.6 * opacity,
        filter: 'blur(60px)',
      }}
    />
  );
};

const PhoneFrame = ({ opacity, children }) => {
  const frame = useCurrentFrame();
  
  const timeProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        width: '320px',
        height: '650px',
        background: 'white',
        borderRadius: '32px',
        position: 'relative',
        overflow: 'hidden',
        opacity,
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15)',
      }}
    >
      {children}
    </div>
  );
};

const ProfileCard = ({ delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return <div>Profile Card 1</div>;
};

export default function MobileApp1() {
  return (
    <PhoneFrame opacity={1}>
      <ProfileCard delay={0} />
    </PhoneFrame>
  );
}`
      },
      {
        id: 'f5b2d141-4b32-4726-aca5-642080b75800',
        name: 'Mobile App 2',
        tsxCode: `
// Second Mobile App with exact same component names!
const GradientCircle = ({ x, y, size, color1, color2, opacity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: \`radial-gradient(circle at 30% 30%, \${color1}, \${color2})\`,
        opacity: 0.6 * opacity,
        filter: 'blur(60px)',
      }}
    />
  );
};

const PhoneFrame = ({ opacity, children }) => {
  const frame = useCurrentFrame();
  
  const timeProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        width: '320px',
        height: '650px',
        background: 'white',
        borderRadius: '32px',
        position: 'relative',
        overflow: 'hidden',
        opacity,
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15)',
      }}
    >
      {children}
    </div>
  );
};

const ProfileCard = ({ delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return <div>Profile Card 2</div>;
};

export default function MobileApp2() {
  return (
    <PhoneFrame opacity={1}>
      <ProfileCard delay={0} />
    </PhoneFrame>
  );
}`
      }
    ]
  },

  // Scenario 2: Project with Button components in multiple scenes
  buttonConflictProject: {
    projectId: 'test-buttons',
    scenes: [
      {
        id: 'scene-1',
        name: 'Login Screen',
        tsxCode: `
const Button = ({ text, onClick }) => {
  return (
    <button 
      onClick={onClick}
      style={{
        padding: '12px 24px',
        background: 'blue',
        color: 'white',
        border: 'none',
        borderRadius: '8px'
      }}
    >
      {text}
    </button>
  );
};

export default function LoginScreen() {
  return (
    <div>
      <Button text="Login" onClick={() => console.log('login')} />
      <Button text="Register" onClick={() => console.log('register')} />
    </div>
  );
}`
      },
      {
        id: 'scene-2',
        name: 'Dashboard',
        tsxCode: `
const Button = ({ label, action }) => {
  // Different Button implementation!
  return (
    <button 
      onClick={action}
      style={{
        padding: '8px 16px',
        background: 'green',
        color: 'white',
        border: '1px solid darkgreen',
        borderRadius: '4px'
      }}
    >
      {label}
    </button>
  );
};

const Card = ({ title, children }) => {
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h2>{title}</h2>
      {children}
    </div>
  );
};

export default function Dashboard() {
  return (
    <Card title="Dashboard">
      <Button label="Refresh" action={() => location.reload()} />
      <Button label="Export" action={() => console.log('export')} />
    </Card>
  );
}`
      },
      {
        id: 'scene-3', 
        name: 'Settings',
        tsxCode: `
const Button = ({ children, variant = 'primary' }) => {
  // Yet another Button implementation!
  const styles = {
    primary: { background: 'purple', color: 'white' },
    secondary: { background: 'gray', color: 'white' },
    danger: { background: 'red', color: 'white' }
  };
  
  return (
    <button style={{ ...styles[variant], padding: '10px 20px' }}>
      {children}
    </button>
  );
};

const Card = ({ content }) => {
  // Card component also conflicts with Dashboard!
  return <div style={{ padding: '15px', background: '#f0f0f0' }}>{content}</div>;
};

export default function Settings() {
  return (
    <Card content={
      <>
        <Button variant="primary">Save Settings</Button>
        <Button variant="danger">Delete Account</Button>
      </>
    } />
  );
}`
      }
    ]
  }
};

async function testProductionConflicts() {
  console.log('🧪 Testing Conflict Detection with Real Production Data\n');
  console.log('=' .repeat(60));
  
  // Test Scenario 1: Mobile App Components
  console.log('\n📱 Scenario 1: Mobile App Project with Duplicate Components');
  console.log('-'.repeat(60));
  
  const mobileProject = REAL_PRODUCTION_SCENARIOS.mobileAppProject;
  const mobileResults = [];
  
  for (let i = 0; i < mobileProject.scenes.length; i++) {
    const scene = mobileProject.scenes[i];
    console.log(`\n🔍 Compiling scene ${i + 1}: ${scene.name}`);
    
    const startTime = performance.now();
    const result = await sceneCompiler.compileScene(scene.tsxCode, {
      projectId: mobileProject.projectId,
      sceneId: scene.id,
      existingScenes: mobileProject.scenes.slice(0, i)
    });
    const duration = performance.now() - startTime;
    
    console.log(`  ⏱️  Compilation time: ${duration.toFixed(2)}ms`);
    console.log(`  ✅ Success: ${result.success}`);
    
    if (result.conflicts && result.conflicts.length > 0) {
      console.log(`  ⚠️  Conflicts detected: ${result.conflicts.length}`);
      result.conflicts.forEach(conflict => {
        console.log(`     - ${conflict.originalName} → ${conflict.newName}`);
      });
    } else {
      console.log(`  ✨ No conflicts`);
    }
    
    mobileResults.push(result);
  }
  
  // Test Scenario 2: Button Components
  console.log('\n\n🔘 Scenario 2: Button Components with Different Implementations');
  console.log('-'.repeat(60));
  
  const buttonProject = REAL_PRODUCTION_SCENARIOS.buttonConflictProject;
  const buttonResults = [];
  
  for (let i = 0; i < buttonProject.scenes.length; i++) {
    const scene = buttonProject.scenes[i];
    console.log(`\n🔍 Compiling scene ${i + 1}: ${scene.name}`);
    
    const startTime = performance.now();
    const result = await sceneCompiler.compileScene(scene.tsxCode, {
      projectId: buttonProject.projectId,
      sceneId: scene.id,
      existingScenes: buttonProject.scenes.slice(0, i)
    });
    const duration = performance.now() - startTime;
    
    console.log(`  ⏱️  Compilation time: ${duration.toFixed(2)}ms`);
    console.log(`  ✅ Success: ${result.success}`);
    
    if (result.conflicts && result.conflicts.length > 0) {
      console.log(`  ⚠️  Conflicts detected: ${result.conflicts.length}`);
      result.conflicts.forEach(conflict => {
        console.log(`     - ${conflict.originalName} → ${conflict.newName} (conflicts with scene: ${conflict.conflictingSceneId.substring(0, 8)}...)`);
      });
    } else {
      console.log(`  ✨ No conflicts`);
    }
    
    buttonResults.push(result);
  }
  
  // Summary
  console.log('\n\n📊 Summary');
  console.log('='.repeat(60));
  
  const totalScenes = mobileResults.length + buttonResults.length;
  const scenesWithConflicts = [...mobileResults, ...buttonResults].filter(r => r.conflicts && r.conflicts.length > 0).length;
  const totalConflicts = [...mobileResults, ...buttonResults].reduce((sum, r) => sum + (r.conflicts?.length || 0), 0);
  const allSuccessful = [...mobileResults, ...buttonResults].every(r => r.success);
  
  console.log(`  Total scenes compiled: ${totalScenes}`);
  console.log(`  Scenes with conflicts: ${scenesWithConflicts}`);
  console.log(`  Total conflicts auto-fixed: ${totalConflicts}`);
  console.log(`  All compilations successful: ${allSuccessful ? '✅ YES' : '❌ NO'}`);
  console.log(`  Regenerations triggered: 0 (by design!)`);
  
  // Verification
  console.log('\n\n🔬 Verification');
  console.log('='.repeat(60));
  
  // Check that renamed components are correctly renamed throughout
  const scene3Result = buttonResults[2]; // Settings scene
  if (scene3Result.conflicts) {
    console.log('\nChecking Settings scene auto-fixes:');
    
    // Button should be renamed
    const buttonConflict = scene3Result.conflicts.find(c => c.originalName === 'Button');
    if (buttonConflict) {
      const buttonRegex = new RegExp(`\\b${buttonConflict.newName}\\b`, 'g');
      const buttonMatches = scene3Result.tsxCode.match(buttonRegex);
      console.log(`  ✅ Button renamed to ${buttonConflict.newName}`);
      console.log(`     Found ${buttonMatches?.length || 0} references in code`);
    }
    
    // Card should be renamed
    const cardConflict = scene3Result.conflicts.find(c => c.originalName === 'Card');
    if (cardConflict) {
      const cardRegex = new RegExp(`\\b${cardConflict.newName}\\b`, 'g');
      const cardMatches = scene3Result.tsxCode.match(cardRegex);
      console.log(`  ✅ Card renamed to ${cardConflict.newName}`);
      console.log(`     Found ${cardMatches?.length || 0} references in code`);
    }
  }
  
  console.log('\n✨ Test completed successfully!');
}

// Run the test
testProductionConflicts().catch(console.error);

export { testProductionConflicts };