#!/usr/bin/env node

/**
 * Script to ensure fonts are properly copied for Lambda deployment
 * This script ensures fonts are in the correct location for staticFile() to work
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourceDir = path.join(projectRoot, 'public', 'fonts');
const buildDir = path.join(projectRoot, 'build', 'public', 'fonts');

// Clean up any existing nested structure
const nestedDir = path.join(buildDir, 'public', 'fonts');
if (fs.existsSync(nestedDir)) {
  console.log('[Font Copy] Cleaning up nested directory structure...');
  fs.rmSync(path.join(buildDir, 'public'), { recursive: true, force: true });
}

console.log('[Font Copy] Checking font setup for Lambda deployment...');

// Check if source fonts exist
if (!fs.existsSync(sourceDir)) {
  console.error('[Font Copy] ERROR: Source fonts directory not found:', sourceDir);
  process.exit(1);
}

// Get list of fonts in source
const fonts = fs.readdirSync(sourceDir).filter(f => f.endsWith('.woff2'));
console.log(`[Font Copy] Found ${fonts.length} font files in source directory`);

// Ensure build directory exists
fs.mkdirSync(buildDir, { recursive: true });

// Copy fonts to build directory
let copiedCount = 0;
for (const font of fonts) {
  const sourcePath = path.join(sourceDir, font);
  const destPath = path.join(buildDir, font);
  
  try {
    fs.copyFileSync(sourcePath, destPath);
    copiedCount++;
    console.log(`[Font Copy] ✓ Copied ${font}`);
  } catch (err) {
    console.error(`[Font Copy] ✗ Failed to copy ${font}:`, err.message);
  }
}

console.log(`[Font Copy] Successfully copied ${copiedCount}/${fonts.length} fonts to build directory`);

// Verify all fonts are accessible
const expectedFonts = [
  'Inter-Regular.woff2',
  'Inter-Medium.woff2', 
  'Inter-Bold.woff2',
  'DMSans-Regular.woff2',
  'DMSans-Bold.woff2',
  'Roboto-Regular.woff2',
  'Roboto-Bold.woff2',
  'Poppins-Regular.woff2',
  'Poppins-Bold.woff2'
];

let missingFonts = [];
for (const font of expectedFonts) {
  const fontPath = path.join(sourceDir, font);
  if (!fs.existsSync(fontPath)) {
    missingFonts.push(font);
  }
}

if (missingFonts.length > 0) {
  console.warn('[Font Copy] WARNING: Missing expected fonts:', missingFonts);
} else {
  console.log('[Font Copy] ✓ All expected fonts are present');
}

console.log('[Font Copy] Font setup complete for Lambda deployment');