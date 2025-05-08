#!/usr/bin/env node
// scripts/filtered-dev.ts
//
// A wrapper script that runs Next.js dev server but filters out noisy logs
// Usage: npx tsx scripts/filtered-dev.ts

import { spawn, ChildProcess } from 'child_process';
import path from 'path';

// Patterns to filter out
const FILTER_PATTERNS: string[] = [
  'fetchConnectionCache',
  'option is deprecated',
  'GET /api/trpc/project.getById',
  '200 in',
  'batch=1&input=',
];

console.log('🧹 Starting Next.js with filtered logs...');

// Create a Next.js dev process
const nextProcess: ChildProcess = spawn('npx', ['next', 'dev'], {
  env: { ...process.env },
  stdio: ['inherit', 'pipe', 'pipe'] // We pipe stdout and stderr to filter them
});

// Process stdout to filter out noisy logs
nextProcess.stdout?.on('data', (data: Buffer) => {
  const lines: string[] = data.toString().split('\n');
  
  lines.forEach((line: string) => {
    // Skip lines that match filter patterns
    if (FILTER_PATTERNS.some(pattern => line.includes(pattern))) {
      return;
    }
    
    // Output lines that don't match filter patterns
    process.stdout.write(line + '\n');
  });
});

// Process stderr (generally pass through, but could filter as well)
nextProcess.stderr?.on('data', (data: Buffer) => {
  const lines: string[] = data.toString().split('\n');
  
  lines.forEach((line: string) => {
    // Skip lines that match filter patterns
    if (FILTER_PATTERNS.some(pattern => line.includes(pattern))) {
      return;
    }
    
    // Output lines that don't match filter patterns
    process.stderr.write(line + '\n');
  });
});

nextProcess.on('close', (code: number | null) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle SIGINT (Ctrl+C) and pass it to the child process
process.on('SIGINT', () => {
  nextProcess.kill('SIGINT');
});
