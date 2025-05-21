//src/scripts/test-components/batch-test-components.ts
import * as esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import glob from 'glob';
import { sanitizeTsx } from '../../server/workers/buildCustomComponent';

async function main() {
  const args = process.argv.slice(2);
  const inputPattern = args[0] || 'test-components/**/*.tsx';
  const outputDir = args[1] || path.join(process.cwd(), 'public/test-components');
  
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Find all component files
    const files = glob.sync(inputPattern);
    console.log(`Found ${files.length} components to test`);
    
    // Compile each component
    const results = {
      success: 0,
      failed: 0,
      components: []
    };
    
    for (const file of files) {
      console.log(`Processing: ${file}`);
      const tsxCode = await fs.readFile(file, 'utf8');
      const basename = path.basename(file, '.tsx');
      const outputFile = path.join(outputDir, `${basename}.js`);
      
      // Sanitize and compile
      try {
        const sanitizedCode = sanitizeTsx(tsxCode);
        
        await esbuild.build({
          stdin: {
            contents: sanitizedCode,
            loader: 'tsx',
          },
          outfile: outputFile,
          bundle: true,
          format: 'esm',
          platform: 'browser',
          target: 'es2020',
          minify: false,
          jsxFactory: 'React.createElement',
          jsxFragment: 'React.Fragment',
          external: ['react', 'react-dom', 'remotion', '@remotion/*'],
          logLevel: 'warning',
        });
        
        console.log(`✅ Success: ${basename} -> ${outputFile}`);
        results.success++;
        results.components.push({
          name: basename,
          status: 'success',
          inputPath: file,
          outputPath: outputFile
        });
      } catch (error) {
        console.error(`❌ Failed: ${basename} - ${error.message}`);
        results.failed++;
        results.components.push({
          name: basename,
          status: 'failed',
          inputPath: file,
          error: error.message
        });
      }
    }
    
    // Generate index page for all components
    const indexPath = path.join(outputDir, 'index.html');
    const componentFiles = glob.sync(path.join(outputDir, '*.js'));
    
    const componentLinks = results.components
      .map(comp => {
        if (comp.status === 'success') {
          return `<li class="success">
            <a href="${comp.name}.html">${comp.name}</a>
            <span class="badge success">Success</span>
          </li>`;
        } else {
          return `<li class="error">
            <span>${comp.name}</span>
            <span class="badge error">Failed</span>
            <div class="error-message">${comp.error}</div>
          </li>`;
        }
      })
      .join('\n');
    
    const indexHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Component Test Gallery</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .stats { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 4px; }
    .stats .count { font-weight: bold; font-size: 1.2em; }
    .success-count { color: #22c55e; }
    .error-count { color: #ef4444; }
    ul { list-style-type: none; padding: 0; }
    li { margin: 10px 0; padding: 15px; border: 1px solid #eee; border-radius: 4px; display: flex; flex-direction: column; }
    li.success { border-left: 4px solid #22c55e; }
    li.error { border-left: 4px solid #ef4444; }
    a { color: #0070f3; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .badge { font-size: 0.8em; padding: 3px 8px; border-radius: 4px; margin-left: 10px; }
    .badge.success { background: #dcfce7; color: #166534; }
    .badge.error { background: #fee2e2; color: #b91c1c; }
    .error-message { margin-top: 8px; font-family: monospace; font-size: 0.9em; background: #fee2e2; padding: 8px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Remotion Component Test Gallery</h1>
  
  <div class="stats">
    <p><span class="count success-count">${results.success}</span> successful builds</p>
    <p><span class="count error-count">${results.failed}</span> failed builds</p>
  </div>
  
  <ul>
    ${componentLinks}
  </ul>
</body>
</html>`;
    
    await fs.writeFile(indexPath, indexHtml, 'utf8');
    console.log(`Created component gallery index at: ${indexPath}`);
    
    // Generate a JSON report with results
    const reportPath = path.join(outputDir, 'test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Component test report saved to: ${reportPath}`);
    
    console.log(`\nSummary: ${results.success} succeeded, ${results.failed} failed`);
    
  } catch (error) {
    console.error('Error during batch processing:', error);
    process.exit(1);
  }
}

main();
