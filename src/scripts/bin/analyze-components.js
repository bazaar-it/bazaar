#!/usr/bin/env node
// Entry point for component analysis
import { program } from 'commander';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

program
  .name('analyze-components')
  .description('Analyze components in the Bazaar-Vid application')
  .version('1.0.0');

// Add commands from the commands/components/analyze directory
const analyzeCommands = ['errors', 'syntax', 'r2'];

for (const cmd of analyzeCommands) {
  try {
    const module = await import(`../commands/components/analyze/analyze-${cmd}.js`);
    const command = program.command(cmd)
      .description(module.description || `Analyze component ${cmd}`);
    
    if (module.configure) {
      module.configure(command);
    } else if (module.action) {
      command.action(module.action);
    }
  } catch (err) {
    console.warn(`Failed to load analyze command '${cmd}':`, err.message);
  }
}

program.parse(process.argv);
