//src/scripts/component-verify/inlineValidation.js

// Simplified version of the TSX preprocessor for validation
const fs = require('fs');
const path = require('path');

/**
 * Pre-process TSX code to fix common syntax errors before validation
 */
function preprocessTsx(tsxCode, componentName = 'Component') {
  let fixed = false;
  const issues = [];
  let code = tsxCode;

  try {
    // 1. Fix variable redeclarations
    const fixedRedeclarations = fixVariableRedeclarations(code);
    if (fixedRedeclarations.fixed) {
      code = fixedRedeclarations.code;
      issues.push(...fixedRedeclarations.issues);
      fixed = true;
    }
    
    // 2. Fix unclosed JSX tags
    const jsxTagPairFixes = fixUnclosedJsxTags(code);
    if (jsxTagPairFixes.fixed) {
      code = jsxTagPairFixes.code;
      issues.push(...jsxTagPairFixes.issues);
      fixed = true;
    }
    
    // 3. Fix unescaped HTML/XML in string literals
    const stringLiteralFixes = fixUnescapedHtmlInStrings(code);
    if (stringLiteralFixes.fixed) {
      code = stringLiteralFixes.code;
      issues.push(...stringLiteralFixes.issues);
      fixed = true;
    }
    
    // 4. Ensure there's a default export for the component if missing
    const exportFixes = ensureComponentExport(code, componentName);
    if (exportFixes.fixed) {
      code = exportFixes.code;
      issues.push(...exportFixes.issues);
      fixed = true;
    }
    
  } catch (error) {
    console.error(`[TSX_PREPROCESS] Error preprocessing TSX for ${componentName}:`, error.message);
    issues.push(`Error during preprocessing: ${error.message}`);
  }

  return { code, issues, fixed };
}

/**
 * Fix variable redeclarations, focusing on common Remotion hooks
 */
function fixVariableRedeclarations(code) {
  const issues = [];
  let fixed = false;
  let result = code;
  
  // Check for duplicate frame declarations
  const frameRegex = /const\s+frame\s*=\s*useCurrentFrame\(\);/g;
  const frameMatches = result.match(frameRegex) || [];
  
  if (frameMatches.length > 1) {
    // Keep only the first declaration
    let firstMatch = true;
    result = result.replace(frameRegex, (match) => {
      // Keep the first occurrence, remove others
      if (firstMatch) {
        firstMatch = false;
        return match;
      }
      return '/* Removed duplicate frame declaration */';
    });
    
    issues.push('Fixed duplicate frame declaration (useCurrentFrame)');
    fixed = true;
  }
  
  // Check for duplicate videoConfig declarations
  const configRegex = /const\s+(?:videoConfig|config)\s*=\s*useVideoConfig\(\);/g;
  const configMatches = result.match(configRegex) || [];
  
  if (configMatches.length > 1) {
    // Keep only the first declaration
    let firstMatch = true;
    result = result.replace(configRegex, (match) => {
      // Keep the first occurrence, remove others
      if (firstMatch) {
        firstMatch = false;
        return match;
      }
      return '/* Removed duplicate videoConfig declaration */';
    });
    
    issues.push('Fixed duplicate videoConfig declaration (useVideoConfig)');
    fixed = true;
  }
  
  return { code: result, issues, fixed };
}

/**
 * Fix unclosed JSX tags using a simple regex-based approach
 */
function fixUnclosedJsxTags(code) {
  const issues = [];
  let fixed = false;
  let result = code;
  
  // Simple pattern to identify potential JSX opening tags without closing
  const svgRegex = /<svg\b[^>]*>[\s\S]*?(?=<\/svg>|$)/g;
  const svgMatches = result.match(svgRegex) || [];
  
  for (const svgMatch of svgMatches) {
    if (!svgMatch.endsWith('</svg>')) {
      // This SVG might have unclosed tags
      
      // Look for unclosed circle tags
      const circleRegex = /<circle\b[^>]*?(?!\/>)(?=>)/g;
      const fixedSvg = svgMatch.replace(circleRegex, match => `${match.slice(0, -1)} />`);
      
      if (fixedSvg !== svgMatch) {
        result = result.replace(svgMatch, fixedSvg);
        issues.push('Fixed unclosed circle tag in SVG');
        fixed = true;
      }
    }
  }
  
  // Check for unclosed tags more generally
  const commonElements = ['circle', 'rect', 'path', 'g', 'svg', 'line', 'polyline', 'polygon'];
  
  for (const element of commonElements) {
    // Look for patterns like: <element ... without a closing ">" or "/>"
    const unclosedPattern = new RegExp(`<${element}[^>]*(?<!/)>\\s*<`, 'g');
    const hasUnclosed = unclosedPattern.test(result);
    
    if (hasUnclosed) {
      const elementRegex = new RegExp(`<${element}\\b[^>]*?(?!\\/>)(?=>)`, 'g');
      result = result.replace(elementRegex, match => `${match.slice(0, -1)} />`);
      issues.push(`Fixed unclosed ${element} tag`);
      fixed = true;
    }
  }
  
  return { code: result, issues, fixed };
}

/**
 * Fix unescaped HTML/XML in string literals
 */
function fixUnescapedHtmlInStrings(code) {
  const issues = [];
  let fixed = false;
  let result = code;
  
  // Match string literals that contain < and > characters
  const stringLiteralPattern = /"([^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g;
  
  result = result.replace(stringLiteralPattern, (match) => {
    // Only process if it contains < or > and looks like HTML/XML
    if ((match.includes('<') && match.includes('>')) && 
        /[<][a-zA-Z\/]/.test(match)) {
      
      const escaped = match
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      if (escaped !== match) {
        issues.push('Fixed unescaped HTML characters in string literal');
        fixed = true;
        return escaped;
      }
    }
    return match;
  });
  
  return { code: result, issues, fixed };
}

/**
 * Ensure the component has a proper export statement
 */
function ensureComponentExport(code, componentName) {
  const issues = [];
  let fixed = false;
  let result = code;
  
  // Check if there's an export statement for this component
  const hasDefaultExport = /export\s+default\s+(?:function\s+)?(\w+)/.test(code);
  const hasNamedExport = new RegExp(`export\\s+(?:const|function|class)\\s+${componentName}`).test(code);
  
  // If no export is found, add default export at the end
  if (!hasDefaultExport && !hasNamedExport) {
    // Try to find the component function/class/const declaration
    const componentDefRegex = new RegExp(`(?:function|class|const)\\s+${componentName}`);
    const hasComponentDef = componentDefRegex.test(code);
    
    if (hasComponentDef) {
      // Add default export at the end
      result += `\n\n// Added by pre-processor\nexport default ${componentName};\n`;
      issues.push(`Added missing default export for ${componentName}`);
      fixed = true;
    } else {
      // If we can't find the component definition, log an issue
      issues.push(`Could not find component declaration for ${componentName} to add export`);
    }
  }
  
  // Ensure window.__REMOTION_COMPONENT is set
  if (!code.includes('window.__REMOTION_COMPONENT')) {
    result += `\n\n// Added by pre-processor - required for Remotion
if (typeof window !== 'undefined') {
  window.__REMOTION_COMPONENT = ${componentName};
}\n`;
    issues.push('Added missing window.__REMOTION_COMPONENT assignment');
    fixed = true;
  }
  
  return { code: result, issues, fixed };
}

/**
 * Test the TSX preprocessor with problematic component examples
 * This script demonstrates how the preprocessor can fix common syntax issues
 */
async function validatePreprocessor() {
  console.log('TSX Preprocessor Validation');
  console.log('=========================');
  
  const componentsDir = path.join(__dirname, 'problematic-components');
  const outputDir = path.join(__dirname, 'fixed-components');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get all TSX files in the problematic components directory
  const files = fs.readdirSync(componentsDir)
    .filter(file => file.endsWith('.tsx'));
  
  console.log(`Found ${files.length} problematic component files to test\n`);
  
  // Process each file with the preprocessor
  for (const file of files) {
    const componentName = path.basename(file, '.tsx');
    const filePath = path.join(componentsDir, file);
    const outputPath = path.join(outputDir, file);
    
    console.log(`\nProcessing ${componentName}...`);
    
    try {
      // Read the component code
      const code = fs.readFileSync(filePath, 'utf8');
      
      // Process with the preprocessor
      console.log('Before preprocessing:');
      console.log('-------------------');
      console.log(`Original code: ${code.length} characters`);
      
      console.log('\nApplying preprocessor...');
      const result = preprocessTsx(code, componentName);
      
      console.log('\nPreprocessor Results:');
      console.log('-------------------');
      console.log(`Fixed: ${result.fixed}`);
      console.log('Issues found:');
      result.issues.forEach(issue => console.log(`- ${issue}`));
      
      // Save the fixed component
      fs.writeFileSync(outputPath, result.code, 'utf8');
      console.log(`\nFixed version saved to ${outputPath}`);
      console.log(`Fixed code: ${result.code.length} characters`);
      
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  console.log('\nValidation complete!');
}

// Run the validation
validatePreprocessor().catch(error => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
