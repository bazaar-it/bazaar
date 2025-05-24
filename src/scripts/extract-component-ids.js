// @ts-nocheck
// src/scripts/extract-component-ids.js

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

/**
 * Extract component IDs from log files and save them to a reference file.
 * Run with: node src/scripts/extract-component-ids.js
 */

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const logsDir = path.resolve(process.cwd(), 'logs');
const outputFile = path.resolve(process.cwd(), 'memory-bank', 'component-ids.md');
const days = 5; // How many days of logs to scan

// Helper for getting date strings
function getDateString(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0].replace(/-/g, '-');
}

// Get log files to process
async function getLogFiles() {
  try {
    const files = await fs.promises.readdir(logsDir);
    const logFiles = [];
    
    for (let i = 0; i <= days; i++) {
      const dateStr = getDateString(i);
      const matchingFiles = files.filter(file => 
        file.startsWith('combined-' + dateStr) || 
        file.includes(dateStr)
      );
      logFiles.push(...matchingFiles);
    }
    
    return logFiles.map(file => path.join(logsDir, file));
  } catch (error) {
    console.error('Error reading log directory:', error);
    return [];
  }
}

// Extract component IDs from a log file
async function extractComponentIds(filePath) {
  const componentIds = new Set();
  const fileStream = fs.createReadStream(filePath);
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  // Regular expression for UUIDs
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
  
  for await (const line of rl) {
    // Look for component-related log entries
    if (line.includes('Component') || 
        line.includes('component') || 
        line.includes('/api/components/')) {
      const matches = line.match(uuidRegex);
      if (matches) {
        matches.forEach(id => componentIds.add(id));
      }
    }
  }
  
  return Array.from(componentIds);
}

// Generate the markdown reference file
async function generateReferenceFile(allIds) {
  // Group by first character for easier navigation
  const groupedIds = {};
  
  allIds.forEach(id => {
    const firstChar = id.charAt(0).toLowerCase();
    if (!groupedIds[firstChar]) {
      groupedIds[firstChar] = [];
    }
    groupedIds[firstChar].push(id);
  });
  
  // Create markdown content
  let content = `# Component ID Reference\n\n`;
  content += `*Last updated: ${new Date().toISOString()}*\n\n`;
  content += `This file contains component IDs extracted from logs for testing and debugging purposes.\n\n`;
  content += `## Usage Examples\n\n`;
  content += `\`\`\`bash\n`;
  content += `# Diagnose a component\n`;
  content += `npx tsx src/scripts/diagnose-component.ts <componentId>\n\n`;
  content += `# Fix a component\n`;
  content += `npx tsx src/scripts/fix-component.ts <componentId> --apply\n\n`;
  content += `# Get component details\n`;
  content += `npx tsx src/scripts/debug-db.ts component-details <componentId>\n`;
  content += `\`\`\`\n\n`;
  
  content += `## Component IDs\n\n`;
  
  // Add jump links
  const chars = Object.keys(groupedIds).sort();
  content += chars.map(char => `[${char.toUpperCase()}](#${char.toUpperCase()})`).join(' | ') + '\n\n';
  
  // Add each group
  for (const char of chars) {
    content += `### ${char.toUpperCase()}\n\n`;
    
    for (const id of groupedIds[char].sort()) {
      content += `- \`${id}\`\n`;
    }
    
    content += '\n';
  }
  
  content += `\n\n*Total: ${allIds.length} component IDs*\n`;
  
  // Write to file
  try {
    await fs.promises.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.promises.writeFile(outputFile, content);
    console.log(`Reference file generated at: ${outputFile}`);
  } catch (error) {
    console.error('Error writing reference file:', error);
  }
}

// Main function
async function main() {
  console.log('Extracting component IDs from log files...');
  
  const logFiles = await getLogFiles();
  console.log(`Found ${logFiles.length} log files to process.`);
  
  const allIds = new Set();
  
  for (const file of logFiles) {
    console.log(`Processing ${path.basename(file)}...`);
    const ids = await extractComponentIds(file);
    ids.forEach(id => allIds.add(id));
  }
  
  console.log(`Extracted ${allIds.size} unique component IDs.`);
  
  await generateReferenceFile(Array.from(allIds));
}

main().catch(console.error); 