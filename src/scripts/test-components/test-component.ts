//src/scripts/test-components/test-component.ts
import * as esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import * as url from 'url';
import { sanitizeTsx } from '../../server/workers/buildCustomComponent';

// Get the directory of the current module (ESM-compatible)
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: npx tsx src/scripts/test-components/test-component.ts <input-tsx-file> [output-js-file]');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1] || path.join(process.cwd(), 'public/test-components', path.basename(inputFile, '.tsx') + '.js');
  
  try {
    console.log(`Reading input file: ${inputFile}`);
    const tsxCode = await fs.readFile(inputFile, 'utf8');
    
    console.log('Sanitizing TSX code...');
    const sanitizedCode = sanitizeTsx(tsxCode);
    
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    
    console.log('Compiling with esbuild...');
    await esbuild.build({
      stdin: {
        contents: sanitizedCode,
        loader: 'tsx',
      },
      outfile: outputFile,
      bundle: true,
      format: 'esm', // ES Module format as per the existing configuration
      platform: 'browser',
      target: 'es2020',
      minify: false, // Skip minification for better debugging
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      external: ['react', 'react-dom', 'remotion', '@remotion/*'],
      logLevel: 'info',
    });
    
    console.log(`Component successfully compiled to: ${outputFile}`);
    
    // Generate HTML test file for browser preview
    const htmlOutput = path.join(path.dirname(outputFile), path.basename(outputFile, '.js') + '.html');
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Component Test</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.2.0",
        "react-dom": "https://esm.sh/react-dom@18.2.0",
        "remotion": "https://esm.sh/remotion@4.0.0",
        "@remotion/player": "https://esm.sh/@remotion/player@4.0.0"
      }
    }
  </script>
  <script type="module">
    import { Player } from "https://esm.sh/@remotion/player@4.0.0";
    import Component from "./${path.basename(outputFile)}";
    
    document.addEventListener('DOMContentLoaded', () => {
      const container = document.getElementById('player-container');
      // Create player instance
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(Player, {
        component: Component,
        durationInFrames: 150,
        compositionWidth: 1280,
        compositionHeight: 720,
        fps: 30,
        controls: true
      }));
    });
  </script>
</head>
<body>
  <div id="player-container" style="width: 100%; height: 100vh;"></div>
</body>
</html>`;
    
    await fs.writeFile(htmlOutput, htmlContent, 'utf8');
    console.log(`Test HTML file created at: ${htmlOutput}`);
    
  } catch (error) {
    console.error('Error during compilation:', error);
    process.exit(1);
  }
}

main();
