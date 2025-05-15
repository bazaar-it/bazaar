#!/usr/bin/env node
// Entry point for database migrations
import { program } from 'commander';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

program
  .name('migrate-db')
  .description('Run database migrations for Bazaar-Vid')
  .version('1.0.0');

// Find all migration files
const migrationsDir = path.join(__dirname, '../commands/db/migrate');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
  .sort();

// Add commands for each migration
for (const file of migrationFiles) {
  const migrationName = path.basename(file, path.extname(file));
  
  program.command(migrationName)
    .description(`Run ${migrationName} migration`)
    .action(async () => {
      try {
        console.log(`Running migration: ${migrationName}`);
        const module = await import(`../commands/db/migrate/${file}`);
        if (module.run) {
          await module.run();
          console.log(`✅ ${migrationName} completed successfully`);
        } else {
          console.error(`❌ ${migrationName} is missing a run() export`);
        }
      } catch (err) {
        console.error(`❌ Error running ${migrationName}:`, err);
        process.exit(1);
      }
    });
}

program.parse(process.argv);
