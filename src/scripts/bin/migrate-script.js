#!/usr/bin/env node
//src/scripts/bin/migrate-script.js
import fs from 'fs/promises';
import path from 'path';
import { program } from 'commander';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('MIGRATE-SCRIPT');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Command definition
program
  .name('migrate-script')
  .description('Migrate an existing script to the new structure')
  .argument('<source>', 'Source script path (relative to src/scripts)')
  .argument('<destination>', 'Destination path (relative to src/scripts)')
  .option('-t, --transform', 'Transform to ESM and add path comments')
  .option('-d, --dry-run', 'Show what would be done without making changes')
  .action(async (source, destination, options) => {
    try {
      // Resolve paths
      const scriptsDir = path.resolve(__dirname, '..');
      const sourcePath = path.resolve(scriptsDir, source);
      const destPath = path.resolve(scriptsDir, destination);
      
      // Check if source exists
      try {
        await fs.access(sourcePath);
      } catch (err) {
        logger.error(`Source file does not exist: ${sourcePath}`);
        process.exit(1);
      }
      
      // Create destination directory if needed
      const destDir = path.dirname(destPath);
      if (!options.dryRun) {
        await fs.mkdir(destDir, { recursive: true });
      }
      
      // Read source file
      const content = await fs.readFile(sourcePath, 'utf-8');
      
      // Transform content if needed
      let newContent = content;
      
      if (options.transform) {
        const relativePath = path.relative(path.resolve(scriptsDir, '..'), destPath);
        
        // Add path comment if not present
        if (!newContent.trim().startsWith('//')) {
          newContent = `//${relativePath}\n${newContent}`;
        }
        
        // Transform CommonJS to ESM if needed
        if (newContent.includes('require(')) {
          newContent = newContent
            // Replace require statements
            .replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g, 'import $1 from \'$2\';')
            .replace(/const\s*{\s*([^}]+)\s*}\s*=\s*require\(['"]([^'"]+)['"]\)/g, 'import { $1 } from \'$2\';')
            // Replace module.exports
            .replace(/module\.exports\s*=\s*([^;]+);/g, 'export default $1;')
            .replace(/exports\.(\w+)\s*=\s*([^;]+);/g, 'export const $1 = $2;');
        }
      }
      
      // Write to destination if not dry run
      if (options.dryRun) {
        logger.info(`Would migrate ${sourcePath} to ${destPath}`);
        if (options.transform) {
          logger.info('Transformed content:');
          console.log('-'.repeat(40));
          console.log(newContent.substring(0, 500) + (newContent.length > 500 ? '...' : ''));
          console.log('-'.repeat(40));
        }
      } else {
        await fs.writeFile(destPath, newContent);
        logger.success(`Migrated ${source} to ${destination}`);
      }
      
    } catch (error) {
      logger.error('Migration failed:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
