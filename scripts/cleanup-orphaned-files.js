#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load the dependency analysis
const analysisPath = path.join(__dirname, '..', 'dependency-analysis.json');
const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

// Get orphaned files
const orphanedFiles = analysis.categories.ORPHANED;

console.log(`Found ${orphanedFiles.length} orphaned files to delete\n`);

// Group by directory for better visualization
const filesByDir = {};
orphanedFiles.forEach(file => {
  const dir = path.dirname(file);
  if (!filesByDir[dir]) {
    filesByDir[dir] = [];
  }
  filesByDir[dir].push(file);
});

// Show what will be deleted
console.log('Files to be deleted by directory:');
Object.entries(filesByDir)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([dir, files]) => {
    console.log(`\n${dir}/ (${files.length} files)`);
    files.forEach(file => {
      console.log(`  - ${path.basename(file)}`);
    });
  });

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`\n⚠️  WARNING: This will permanently delete ${orphanedFiles.length} files!`);
console.log('Make sure you have committed your current changes.');

rl.question('\nDo you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    console.log('\nDeleting orphaned files...\n');
    
    let deletedCount = 0;
    let errorCount = 0;
    
    orphanedFiles.forEach(file => {
      const fullPath = path.join(__dirname, '..', 'src', file);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`✓ Deleted: ${file}`);
          deletedCount++;
        } else {
          console.log(`⚠️  Not found: ${file}`);
        }
      } catch (error) {
        console.error(`✗ Error deleting ${file}: ${error.message}`);
        errorCount++;
      }
    });
    
    // Clean up empty directories
    console.log('\nCleaning up empty directories...');
    const dirsToCheck = Object.keys(filesByDir).sort().reverse();
    
    dirsToCheck.forEach(dir => {
      const fullDir = path.join(__dirname, '..', 'src', dir);
      try {
        if (fs.existsSync(fullDir)) {
          const remaining = fs.readdirSync(fullDir);
          if (remaining.length === 0) {
            fs.rmdirSync(fullDir);
            console.log(`✓ Removed empty directory: ${dir}`);
          }
        }
      } catch (error) {
        // Directory might have files, that's ok
      }
    });
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   - Files deleted: ${deletedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`\nNext steps:`);
    console.log(`1. Run 'npm run build' to verify the build still works`);
    console.log(`2. Run 'npm test' to ensure tests pass`);
    console.log(`3. Commit the deletions with: git add -A && git commit -m "Remove ${deletedCount} orphaned files"`);
  } else {
    console.log('\nCleanup cancelled.');
  }
  
  rl.close();
});