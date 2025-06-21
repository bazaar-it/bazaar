#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

class DependencyAnalyzer {
  constructor(srcPath) {
    this.srcPath = srcPath;
    this.files = new Map();
    this.activeEntryPoints = [];
  }

  analyze() {
    console.log('Starting dependency analysis...\n');
    
    // Step 1: Find all TypeScript files
    this.findAllFiles(this.srcPath);
    console.log(`Found ${this.files.size} TypeScript files\n`);

    // Step 2: Parse imports for each file
    this.parseAllImports();

    // Step 3: Build reverse dependency map
    this.buildReverseDependencies();

    // Step 4: Identify entry points and active files
    this.identifyActiveFiles();

    // Step 5: Categorize all files
    this.categorizeFiles();

    // Step 6: Generate report
    this.generateReport();
  }

  findAllFiles(dir) {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .next
        if (entry !== 'node_modules' && entry !== '.next') {
          this.findAllFiles(fullPath);
        }
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        const relativePath = path.relative(this.srcPath, fullPath);
        this.files.set(relativePath, {
          path: relativePath,
          imports: [],
          importedBy: []
        });
      }
    }
  }

  parseAllImports() {
    for (const [filePath, fileInfo] of this.files) {
      try {
        const fullPath = path.join(this.srcPath, filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const imports = this.extractImports(content, filePath);
        fileInfo.imports = imports;
      } catch (error) {
        console.error(`Error parsing ${filePath}:`, error.message);
      }
    }
  }

  extractImports(content, filePath) {
    const imports = [];
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          if (importPath.startsWith('~') || importPath.startsWith('.')) {
            const resolvedPath = this.resolveImportPath(importPath, filePath);
            if (resolvedPath) {
              imports.push(resolvedPath);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  resolveImportPath(importPath, fromFile) {
    let resolvedPath = importPath;
    
    // Handle ~ alias
    if (importPath.startsWith('~')) {
      resolvedPath = importPath.substring(2); // Remove ~/
    } else if (importPath.startsWith('.')) {
      // Handle relative imports
      const dir = path.dirname(fromFile);
      resolvedPath = path.join(dir, importPath);
    }

    // Try different extensions
    const extensions = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
    for (const ext of extensions) {
      const testPath = resolvedPath + ext;
      if (this.files.has(testPath)) {
        return testPath;
      }
    }
    
    return null;
  }

  buildReverseDependencies() {
    for (const [filePath, fileInfo] of this.files) {
      for (const importPath of fileInfo.imports) {
        const importedFile = this.files.get(importPath);
        if (importedFile) {
          importedFile.importedBy.push(filePath);
        }
      }
    }
  }

  identifyActiveFiles() {
    // Entry points are files in app/ directory (pages) and API routes
    this.activeEntryPoints = Array.from(this.files.keys()).filter(filePath => {
      return filePath.startsWith('app/') && (
        filePath.endsWith('page.tsx') || 
        filePath.endsWith('layout.tsx') ||
        filePath.endsWith('route.ts') ||
        filePath.includes('/api/')
      );
    });

    // Also include main server files
    this.activeEntryPoints.push(...[
      'server/api/root.ts',
      'trpc/server.ts',
      'trpc/client.tsx'
    ].filter(p => this.files.has(p)));
  }

  categorizeFiles() {
    // Mark all files as orphaned initially
    for (const fileInfo of this.files.values()) {
      fileInfo.category = 'ORPHANED';
      fileInfo.reason = 'No imports found';
    }

    // Mark test files
    for (const [filePath, fileInfo] of this.files) {
      if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')) {
        fileInfo.category = 'TESTS';
        fileInfo.reason = 'Test file';
      }
    }

    // Mark generated files
    for (const [filePath, fileInfo] of this.files) {
      if (filePath.startsWith('generated/')) {
        fileInfo.category = 'GENERATED';
        fileInfo.reason = 'Auto-generated file';
      }
    }

    // Mark active files through dependency traversal
    const visited = new Set();
    const markActive = (filePath, reason) => {
      if (visited.has(filePath)) return;
      visited.add(filePath);
      
      const fileInfo = this.files.get(filePath);
      if (!fileInfo) return;
      
      if (fileInfo.category !== 'TESTS' && fileInfo.category !== 'GENERATED') {
        fileInfo.category = 'ACTIVE';
        fileInfo.reason = reason;
      }
      
      // Mark all imports as active
      for (const importPath of fileInfo.imports) {
        markActive(importPath, `Imported by ${filePath}`);
      }
    };

    // Start from entry points
    for (const entryPoint of this.activeEntryPoints) {
      markActive(entryPoint, 'Entry point');
    }

    // Mark transitional files (Sprint 42 related)
    const transitionalPatterns = [
      'tools/',
      'brain/',
      'server/services/scene/',
      'app/projects/[id]/generate/agents/',
      'app/projects/[id]/generate/utils/',
      'app/projects/[id]/generate/workspace/'
    ];

    for (const [filePath, fileInfo] of this.files) {
      if (fileInfo.category === 'ACTIVE' && 
          transitionalPatterns.some(pattern => filePath.includes(pattern))) {
        fileInfo.category = 'TRANSITIONAL';
        fileInfo.reason = 'Part of Sprint 42 migration';
      }
    }
  }

  generateReport() {
    const categories = {
      ACTIVE: [],
      TRANSITIONAL: [],
      ORPHANED: [],
      TESTS: [],
      GENERATED: []
    };

    // Categorize files
    for (const [filePath, fileInfo] of this.files) {
      if (fileInfo.category) {
        categories[fileInfo.category].push(filePath);
      }
    }

    // Sort each category
    for (const cat of Object.keys(categories)) {
      categories[cat].sort();
    }

    // Print report
    console.log('=== DEPENDENCY ANALYSIS REPORT ===\n');
    console.log(`Total files analyzed: ${this.files.size}`);
    console.log(`Entry points found: ${this.activeEntryPoints.length}\n`);

    console.log('SUMMARY BY CATEGORY:');
    console.log(`- ACTIVE: ${categories.ACTIVE.length} files (in use)`);
    console.log(`- TRANSITIONAL: ${categories.TRANSITIONAL.length} files (will be replaced in Sprint 42)`);
    console.log(`- ORPHANED: ${categories.ORPHANED.length} files (safe to delete)`);
    console.log(`- TESTS: ${categories.TESTS.length} files`);
    console.log(`- GENERATED: ${categories.GENERATED.length} files\n`);

    // Detailed listings
    console.log('\n=== ORPHANED FILES (Safe to delete) ===');
    if (categories.ORPHANED.length === 0) {
      console.log('No orphaned files found!');
    } else {
      for (const filePath of categories.ORPHANED) {
        const fileInfo = this.files.get(filePath);
        console.log(`- ${filePath}`);
        if (fileInfo.importedBy.length > 0) {
          console.log(`  WARNING: Imported by: ${fileInfo.importedBy.join(', ')}`);
        }
      }
    }

    console.log('\n=== TRANSITIONAL FILES (Sprint 42 migration) ===');
    console.log(`${categories.TRANSITIONAL.length} files will be replaced:`);
    const transitionalByDir = {};
    for (const filePath of categories.TRANSITIONAL) {
      const dir = path.dirname(filePath);
      if (!transitionalByDir[dir]) {
        transitionalByDir[dir] = [];
      }
      transitionalByDir[dir].push(filePath);
    }
    for (const [dir, files] of Object.entries(transitionalByDir)) {
      console.log(`\n${dir}/ (${files.length} files)`);
      for (const file of files) {
        console.log(`  - ${path.basename(file)}`);
      }
    }

    console.log('\n=== TEST FILES ===');
    console.log(`${categories.TESTS.length} test files found`);

    console.log('\n=== GENERATED FILES ===');
    for (const filePath of categories.GENERATED) {
      console.log(`- ${filePath}`);
    }

    // Summary
    console.log('\n=== DELETION SUMMARY ===');
    console.log(`Files safe to delete NOW: ${categories.ORPHANED.length}`);
    console.log(`Files to delete AFTER Sprint 42: ${categories.TRANSITIONAL.length}`);
    console.log(`Files that MUST be kept: ${categories.ACTIVE.length + categories.TESTS.length + categories.GENERATED.length}`);

    // Export detailed data
    const outputPath = path.join(this.srcPath, '..', 'dependency-analysis.json');
    const output = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.files.size,
        active: categories.ACTIVE.length,
        transitional: categories.TRANSITIONAL.length,
        orphaned: categories.ORPHANED.length,
        tests: categories.TESTS.length,
        generated: categories.GENERATED.length
      },
      categories,
      files: Object.fromEntries(this.files)
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nDetailed analysis saved to: ${outputPath}`);
  }
}

// Run the analyzer
const srcPath = path.join(__dirname, '..', 'src');
const analyzer = new DependencyAnalyzer(srcPath);
analyzer.analyze();