#!/usr/bin/env node

/**
 * Script to find truly orphaned TypeScript files by analyzing imports
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get all TypeScript files
const srcDir = path.join(__dirname, '..', 'src');
const files = glob.sync('**/*.{ts,tsx}', { 
  cwd: srcDir,
  ignore: ['**/*.d.ts', '**/node_modules/**']
});

console.log(`Found ${files.length} TypeScript files in src/`);

// Track which files are imported
const importedFiles = new Set();
const fileContents = new Map();

// Read all files first
files.forEach(file => {
  const fullPath = path.join(srcDir, file);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    fileContents.set(file, content);
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
});

// Analyze imports
files.forEach(file => {
  const content = fileContents.get(file);
  if (!content) return;
  
  // Match various import patterns
  const importPatterns = [
    /import\s+.*?from\s+['"](.+?)['"]/g,
    /import\s*\(['"](.+?)['"]\)/g,
    /require\s*\(['"](.+?)['"]\)/g,
    /export\s+.*?from\s+['"](.+?)['"]/g
  ];
  
  importPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      
      // Skip external modules
      if (!importPath.startsWith('.') && !importPath.startsWith('~')) continue;
      
      // Resolve the import path
      const resolvedPaths = [
        importPath,
        importPath + '.ts',
        importPath + '.tsx',
        importPath + '/index.ts',
        importPath + '/index.tsx'
      ];
      
      resolvedPaths.forEach(resolved => {
        // Handle alias imports (~/)
        if (resolved.startsWith('~/')) {
          resolved = resolved.replace('~/', '');
        } else if (resolved.startsWith('.')) {
          // Resolve relative imports
          const dir = path.dirname(file);
          resolved = path.join(dir, resolved);
          resolved = path.normalize(resolved);
        }
        
        // Remove .ts/.tsx extension if present
        resolved = resolved.replace(/\.(ts|tsx)$/, '');
        
        // Mark both with and without extension
        importedFiles.add(resolved);
        importedFiles.add(resolved + '.ts');
        importedFiles.add(resolved + '.tsx');
      });
    }
  });
});

// Find orphaned files
const orphanedFiles = [];
files.forEach(file => {
  const normalizedFile = file.replace(/\\/g, '/');
  const withoutExt = normalizedFile.replace(/\.(ts|tsx)$/, '');
  
  // Check if this file is imported anywhere
  if (!importedFiles.has(normalizedFile) && 
      !importedFiles.has(withoutExt) &&
      !file.includes('page.tsx') && // Next.js pages are entry points
      !file.includes('layout.tsx') && // Next.js layouts are entry points
      !file.includes('route.ts') && // Next.js API routes are entry points
      !file.includes('.test.') && // Test files
      !file.includes('.spec.') // Test files
  ) {
    orphanedFiles.push(file);
  }
});

// Group by directory
const byDirectory = {};
orphanedFiles.forEach(file => {
  const dir = path.dirname(file);
  if (!byDirectory[dir]) byDirectory[dir] = [];
  byDirectory[dir].push(file);
});

// Output results
console.log(`\nFound ${orphanedFiles.length} potentially orphaned files:\n`);

Object.entries(byDirectory).sort().forEach(([dir, files]) => {
  console.log(`\n${dir}/ (${files.length} files)`);
  files.sort().forEach(file => {
    console.log(`  ${path.basename(file)}`);
  });
});

// Write to file
const output = {
  totalFiles: files.length,
  orphanedCount: orphanedFiles.length,
  orphanedFiles: orphanedFiles.sort(),
  byDirectory
};

fs.writeFileSync(
  path.join(__dirname, '..', 'orphaned-files.json'),
  JSON.stringify(output, null, 2)
);

console.log(`\nDetailed results written to orphaned-files.json`);
console.log(`\nWARNING: Some files may be dynamically imported or used by build tools.`);
console.log(`Always verify before deleting!`);