// src/scripts/check-working.js

import fs from 'fs';
import path from 'path';

// Let's examine a known working component directly from the filesystem
function checkWorkingComponents() {
  try {
    // Path to a known working component in the source tree
    const componentsDir = path.resolve(process.cwd(), 'src/remotion/components/scenes');
    
    console.log('Examining working components in:', componentsDir);
    
    // Read all scene components
    const files = fs.readdirSync(componentsDir).filter(file => file.endsWith('.tsx'));
    
    console.log(`Found ${files.length} component files`);
    
    // For each component, analyze the pattern
    files.forEach(file => {
      const fullPath = path.join(componentsDir, file);
      const code = fs.readFileSync(fullPath, 'utf8');
      
      console.log(`\n\nAnalyzing component: ${file}`);
      console.log('-----------------------------');
      
      // Check import pattern
      const importStatements = code.match(/import\s+.*?from\s+['"].*?['"];?/g) || [];
      console.log(`Import statements (${importStatements.length}):`);
      importStatements.forEach(imp => console.log(`  ${imp}`));
      
      // Check for React.FC usage
      const reactFC = code.includes('React.FC') || code.includes('React.FunctionComponent');
      console.log(`Uses React.FC: ${reactFC}`);
      
      // Check for AbsoluteFill usage
      const absoluteFill = code.includes('AbsoluteFill');
      console.log(`Uses AbsoluteFill: ${absoluteFill}`);
      
      // Check for hooks usage
      const useCurrentFrame = code.includes('useCurrentFrame');
      const useVideoConfig = code.includes('useVideoConfig');
      console.log(`Uses useCurrentFrame: ${useCurrentFrame}`);
      console.log(`Uses useVideoConfig: ${useVideoConfig}`);
      
      // Check for default export
      const hasDefaultExport = code.includes('export default') || code.match(/export\s+{\s*.*\s+as\s+default\s*}/);
      console.log(`Has default export: ${Boolean(hasDefaultExport)}`);
      
      // Check for props destructuring pattern
      const propsDestructuring = code.match(/(?:const|let|var)\s+{.*?}\s*=\s*props/g) || [];
      console.log(`Props destructuring pattern: ${propsDestructuring.length > 0 ? 'Yes' : 'No'}`);
      
      // Check for closing tag patterns that might cause issues
      const closingTagPattern = code.match(/<\/[a-zA-Z][a-zA-Z0-9]*>\s*\)/g) || [];
      console.log(`Potentially problematic closing tag patterns: ${closingTagPattern.length}`);
      if (closingTagPattern.length > 0) {
        console.log('  Examples:');
        closingTagPattern.slice(0, 3).forEach(pattern => console.log(`    ${pattern}`));
      }
      
      // Check for interface definitions
      const interfaces = code.match(/interface\s+[A-Za-z0-9_]+/g) || [];
      console.log(`Interface definitions: ${interfaces.length}`);
      
      // Print the first 20 lines for reference
      console.log('\nFirst 20 lines:');
      console.log('----------------');
      const firstLines = code.split('\n').slice(0, 20);
      console.log(firstLines.join('\n'));
    });
    
  } catch (error) {
    console.error('Error checking working components:', error);
  }
}

console.log('Starting component pattern analysis...');
checkWorkingComponents();
