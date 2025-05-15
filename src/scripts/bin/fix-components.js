#!/usr/bin/env node
// Entry point for component fixes
import { program } from 'commander';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

program
  .name('fix-components')
  .description('Fix components in the Bazaar-Vid application')
  .version('1.0.0');

// Add commands from the commands/components/fix directory
const fixCommands = ['syntax', 'missing-code', 'stuck'];

for (const cmd of fixCommands) {
  try {
    const module = await import(`../commands/components/fix/fix-component-${cmd}.js`);
    const command = program.command(cmd)
      .description(module.description || `Fix component ${cmd} issues`);
    
    if (module.configure) {
      module.configure(command);
    } else if (module.action) {
      command.action(module.action);
    }
  } catch (err) {
    console.warn(`Failed to load fix command '${cmd}':`, err.message);
  }
}

program.parse(process.argv);
