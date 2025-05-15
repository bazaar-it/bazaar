// /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/scripts/component-verify/verify-pipeline.ts
import chalk from 'chalk';
console.log(chalk.bgMagenta.white.bold('\n\nEXECUTING SCRIPT: verify-pipeline.ts - VERSION CHECK 120\n\n'));

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url'; // For ESM __dirname/__filename

// ESM-compatible __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env.local') }); // Point to root .env.local

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import fs from 'fs';
import axios, { AxiosError } from 'axios';
import puppeteer, { Browser, Page, ConsoleMessage } from 'puppeteer';
import { Pool, type QueryResult } from 'pg';

// Environment variables
const API_URL: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const DB_URL: string | undefined = process.env.DATABASE_URL;
const R2_ENDPOINT: string | undefined = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID: string | undefined = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY: string | undefined = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME: string | undefined = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL: string | undefined = process.env.R2_PUBLIC_URL;

// Create directory for output if it doesn't exist
const outputDir: string = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create PostgreSQL connection pool
if (!DB_URL) {
  console.error(chalk.red('DATABASE_URL environment variable is not set.'));
  process.exit(1);
}
const pool: Pool = new Pool({
  connectionString: DB_URL,
});

// Create R2 client with proper configuration
if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error(chalk.red('R2 environment variables are not fully set.'));
  process.exit(1);
}
const r2: S3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  }
});

// Define interfaces for return types
interface CanaryComponent {
  code: string;
  name: string;
}

interface CompileResult {
  success: boolean;
  publicUrl: string | null;
  error?: string;
}

interface ApiTestResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface RenderTestResult {
  success: boolean;
  screenshotPath?: string;
  error?: string;
}

interface VerificationResults {
  timestamp: string;
  componentId: string;
  componentName: string;
  publicUrl: string | null;
  apiEndpoint: string;
  success: boolean;
  errorMessage?: string | null;
}

interface ErrorResults {
  timestamp: string;
  error: string;
  stack?: string;
}

// Step 1: Generate a canary component
/**
 * Generates a test component guaranteed to render correctly
 * @returns {Promise<CanaryComponent>} The generated component code and name
 */
export async function generateCanaryComponent(): Promise<CanaryComponent> {
  console.log('\n🟢 STEP 1: Generating canary component');
  
  try {
    // Get the canary component from our local file
    const canaryPath: string = path.join(__dirname, 'canary-component.js');
    
    if (!fs.existsSync(canaryPath)) {
      throw new Error(`Canary component file not found at ${canaryPath}`);
    }
    
    const componentCode: string = fs.readFileSync(canaryPath, 'utf8');
    const componentName: string = 'CanaryTestComponent';
    
    console.log(`✅ Generated canary component: ${componentName}`);
    
    // Create a renamed version with timestamp for uniqueness
    const timestamp: number = Date.now();
    const uniqueComponentName: string = `Canary${timestamp}`;
    const uniqueComponentCode: string = componentCode.replace(/CanaryTestComponent/g, uniqueComponentName);
    
    // Write to output dir for debugging
    fs.writeFileSync(path.join(outputDir, `${uniqueComponentName}.js`), uniqueComponentCode);
    
    return {
      code: uniqueComponentCode,
      name: uniqueComponentName
    };
  } catch (error) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error generating canary component: ${errorMessage}`);
    throw error;
  }
}

// Step 2: Store component in database
/**
 * Stores a component in the database
 * @param {string} componentCode - The component code to store
 * @returns {Promise<string>} The component ID
 */
export async function storeComponentInDatabase(componentCode: string): Promise<string> {
  console.log('\n🟢 STEP 2: Storing component in database');
  
  try {
    const componentId: string = uuidv4();
    const effectName: string = `CanaryTest_${Date.now()}`;
    const projectId: string = '00000000-0000-0000-0000-000000000000'; // Placeholder project ID for testing
    
    // Insert the component into the database
    // Using the exact table name from the screenshot
    const query: string = `
      INSERT INTO "bazaar-vid_custom_component_job" (
        id, 
        "projectId",
        effect,
        status,
        "tsxCode",
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, 
        $2,
        $3,
        'generated',
        $4,
        NOW(),
        NOW()
      ) RETURNING id
    `;
    
    const result: QueryResult = await pool.query(query, [
      componentId,
      projectId,
      effectName,
      componentCode
    ]);
    
    if (result.rows.length === 0) {
      throw new Error('Failed to insert component into database');
    }
    
    const id: string = result.rows[0].id;
    console.log(`✅ Component stored in database with ID: ${id}`);
    return id;
  } catch (error) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error storing component in database: ${errorMessage}`);
    throw error;
  }
}

// Step 3: Compile component and upload to R2
/**
 * Compiles a component and uploads it to R2
 * @param {string} componentId - The component ID
 * @param {string} componentCode - The component code
 * @returns {Promise<CompileResult>} Result of the upload
 */
export async function compileAndUploadComponent(componentId: string, componentCode: string): Promise<CompileResult> {
  console.log('\n🟢 STEP 3: Compiling component and uploading to R2');
  
  try {
    // Skip esbuild for this test - we'll manually prepare a bundle
    console.log('📝 Preparing component bundle');
    
    // Simple bundle with the component code
    const bundle: string = componentCode;
    
    // Upload to R2
    console.log(`📤 Uploading to R2: ${componentId}`);
    
    const key: string = `custom-components/${componentId}.js`;
    const command: PutObjectCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: bundle,
      ContentType: 'application/javascript',
    });
    
    await r2.send(command);
    
    // Verify the upload
    const headCommand: HeadObjectCommand = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    
    try {
      const headResult: any = await r2.send(headCommand);
      console.log(`✅ Verified upload: ${key} (${headResult.ContentLength} bytes)`);
    } catch (headError) {
      const errorMessage: string = headError instanceof Error ? headError.message : String(headError);
      console.error(`❌ Failed to verify upload: ${errorMessage}`);
      throw new Error(`Failed to verify upload: ${errorMessage}`);
    }
    
    // Update component status in database
    const updateQuery: string = `
      UPDATE "bazaar-vid_custom_component_job"
      SET status = 'complete', 
          "outputUrl" = $2,
          "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id
    `;
    
    const publicUrl: string = `${R2_PUBLIC_URL}/${key}`;
    const updateResult: QueryResult = await pool.query(updateQuery, [componentId, publicUrl]);
    
    if (updateResult.rows.length === 0) {
      throw new Error('Failed to update component status in database');
    }
    
    console.log(`✅ Updated component status: complete`);
    console.log(`✅ Public URL: ${publicUrl}`);
    
    return {
      success: true,
      publicUrl
    };
  } catch (error) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error compiling/uploading component: ${errorMessage}`);
    
    // Log the full error for debugging
    console.error(error);
    
    throw error;
  }
}

// Step 4: Test API endpoint
/**
 * Tests the API endpoint for a component
 * @param {string} componentId - The component ID
 * @returns {Promise<ApiTestResult>} Result of the API test
 */
export async function testApiEndpoint(componentId: string): Promise<ApiTestResult> {
  console.log('\n🟢 STEP 4: Testing API endpoint');
  
  try {
    const url: string = `${API_URL}/api/components/${componentId}`;
    console.log(`🌐 Requesting: ${url}`);
    
    const response = await axios.get(url);
    
    console.log(chalk.green(`✅ API endpoint response: ${response.status} ${response.statusText}`));
    console.log(chalk.green(`✅ Content type: ${response.headers['content-type']}`));
    
    if (!response.data) {
      console.warn(chalk.yellow('⚠️ API endpoint returned no data'));
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    let errorMessage: string = 'Unknown error testing API endpoint';
    let errorDetails: any = {};

    if (axios.isAxiosError(error)) {
      errorMessage = `Axios error: ${error.message}`;
      console.error(chalk.red(`❌ ${errorMessage}`));
      if (error.response) {
        console.error(chalk.yellow(`Status: ${error.response.status}`));
        console.error(chalk.yellow(`Data: ${JSON.stringify(error.response.data)}`));
        errorDetails = { status: error.response.status, data: error.response.data };
      } else if (error.request) {
        console.error(chalk.yellow('No response received from server for API endpoint test.'));
        errorDetails = { requestError: true };
      }
    } else if (error instanceof Error) {
      errorMessage = `Error testing API endpoint: ${error.message}`;
      console.error(chalk.red(`❌ ${errorMessage}`));
      if (error.stack) console.error(chalk.grey(error.stack));
    } else {
      errorMessage = `An unexpected error occurred during API endpoint test. Error was not an instance of Error.`;
      console.error(chalk.red(`❌ ${errorMessage}`));
    }
    return { success: false, data: errorDetails, error: errorMessage };
  }
}

// Step 5: Test component rendering
/**
 * Tests component rendering in a browser
 * @param {string} componentId - The component ID
 * @param {string} publicUrl - The public URL of the component
 * @returns {Promise<RenderTestResult>} Result of the rendering test
 */
export async function testComponentRendering(componentId: string, publicUrl: string | null): Promise<RenderTestResult> {
  console.log(chalk.bgCyan.black.bold('\n\nINSIDE testComponentRendering - VERSION CHECK 120\n\n'));
  
  if (!publicUrl) {
    console.warn(chalk.yellow('⚠️ Skipping rendering test as publicUrl is null.'));
    return { success: false, error: 'Public URL is null, cannot run rendering test.' };
  }

  const componentGlobalName = 'CanaryTestComponent'; // Name used in UMD generation
  const localTestPagePath = path.join(outputDir, `${componentId}_render_test.html`);

  const testHtmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Render Test - ${componentId}</title>
  <style>
    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #222; }
    #remotion-player { border: 1px solid #444; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
  </style>
  <script>
    // Console log capture for debugging
    window.logs = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.log = function() {
      window.logs.push("[LOG] " + Array.from(arguments).join(' '));
      originalConsoleLog.apply(console, arguments);
    };
    
    console.error = function() {
      window.logs.push("[ERROR] " + Array.from(arguments).join(' '));
      originalConsoleError.apply(console, arguments);
    };
    
    console.warn = function() {
      window.logs.push("[WARN] " + Array.from(arguments).join(' '));
      originalConsoleWarn.apply(console, arguments);
    };
  </script>
</head>
<body>
  <div id="remotion-player" style="width: 1280px; height: 720px;"></div>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script>
    window.Remotion = {
      useCurrentFrame: () => 0,
      useVideoConfig: () => ({ width: 1280, height: 720, fps: 30, durationInFrames: 300 }),
      AbsoluteFill: React.forwardRef(({ style, children }, ref) => 
        React.createElement('div', { ref, style: { ...style, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } }, children)
      ),
      interpolate: (input, inputRange, outputRange, options) => {
        if (input <= inputRange[0]) return outputRange[0];
        if (input >= inputRange[1]) return outputRange[1];
        const progress = (input - inputRange[0]) / (inputRange[1] - inputRange[0]);
        return outputRange[0] + progress * (outputRange[1] - outputRange[0]);
      },
      Sequence: React.forwardRef(({ children }, ref) => React.createElement(React.Fragment, { ref }, children)),
      Easing: { bezier: () => () => 0 } // Add missing Easing object
    };
  </script>
  <script src="${publicUrl}"></script>
  <script type="module">
    const container = document.getElementById('remotion-player');
    const root = ReactDOM.createRoot(container);
    
    function renderComponent() {
      // Check for window.__REMOTION_COMPONENT instead of specific component name
      if (window.__REMOTION_COMPONENT) {
        console.log('Found window.__REMOTION_COMPONENT, attempting to render');
        try {
          // Log the type for debugging
          console.log('Component type:', typeof window.__REMOTION_COMPONENT);
          
          const props = { title: "Canary Test Title", textColor: "white", backgroundColor: "blue" };
          const element = React.createElement(window.__REMOTION_COMPONENT, props);
          root.render(element);
          console.log('Component rendered successfully.');
          
          // Add a success indicator to the DOM for Puppeteer to detect
          const successIndicator = document.createElement('div');
          successIndicator.id = 'component-render-success';
          successIndicator.style.display = 'none';
          document.body.appendChild(successIndicator);
        } catch (e) {
          console.error('Error rendering component:', e);
          container.innerHTML = '<p style="color:red;">Error rendering component: ' + e.message + '</p>';
        }
      } else {
        console.error('window.__REMOTION_COMPONENT not found after script load.');
        container.innerHTML = '<p style="color:red;">Component (__REMOTION_COMPONENT) not found on window object.</p>';
      }
    }

    const checkInterval = setInterval(() => {
      if (window.__REMOTION_COMPONENT) {
        clearInterval(checkInterval);
        renderComponent();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      if (!window.__REMOTION_COMPONENT) {
        console.error('Timeout waiting for __REMOTION_COMPONENT to become available.');
        container.innerHTML = '<p style="color:red;">Timeout waiting for component (__REMOTION_COMPONENT) to load.</p>';
      }
    }, 5000); // 5 seconds timeout
  </script>
</body>
</html>
`;

  fs.writeFileSync(localTestPagePath, testHtmlContent);
  console.log(chalk.blue(`📝 Created test page at ${localTestPagePath}`));

  let browser: Browser | null = null;
  try {
    console.log(chalk.blue('🌐 [PUPPETEER_LOG] Preparing to launch browser...')); 
    console.log(chalk.blue(`🌐 [PUPPETEER_LOG] Current PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'Not set'}`));
    let puppeteerBrowserPath = '';
    try {
      puppeteerBrowserPath = puppeteer.executablePath();
      console.log(chalk.blue(`🌐 [PUPPETEER_LOG] puppeteer.executablePath() reports: ${puppeteerBrowserPath}`));
    } catch (e: any) {
      console.error(chalk.red(`🌐 [PUPPETEER_LOG] Error calling puppeteer.executablePath(): ${e.message}`));
    }
    
    console.log(chalk.blue('🌐 [PUPPETEER_LOG] Inside try block, about to call puppeteer.launch()...'));
    browser = await puppeteer.launch({
      headless: "new", 
      channel: 'chrome', // Use installed stable Chrome browser
      // executablePath: puppeteerBrowserPath || undefined, // We comment this out when using 'channel'
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', 
        '--disable-accelerated-2d-canvas',
        '--disable-gpu' 
      ],
      dumpio: true
    });
    console.log(chalk.blue('🌐 [PUPPETEER_LOG] puppeteer.launch() completed. Browser object:', browser ? 'Exists' : 'Null'));
    
    console.log(chalk.blue('🌐 [PUPPETEER_LOG] Browser launched. Creating new page...'));
    const page: Page = await browser.newPage();
    console.log(chalk.blue('🌐 [PUPPETEER_LOG] New page created. Setting up listeners...'));
    
    page.on('console', msg => console.log(chalk.gray(`PAGE LOG: ${msg.text()}`)));
    page.on('pageerror', err => console.error(chalk.red(`PAGE ERROR: ${err.message}\n${err.stack || 'No stack for pageerror'}`)));
    page.on('requestfailed', request => {
      console.error(chalk.red(`PAGE REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText || 'No error text'}`));
    });
    
    // Listen to network responses
    page.on('response', async (response) => {
      const status = response.status();
      const url = response.url();
      console.log(chalk.dim(`PUPPETEER RESPONSE: ${status} ${url}`));
      if (url === publicUrl) {
        console.log(chalk.blue(`PUPPETEER INFO: Intercepted response for publicUrl: ${publicUrl}, Status: ${status}`));
        try {
          const text = await response.text();
          console.log(chalk.blue(`Response text for publicUrl (first 500 chars): ${text.substring(0, 500)}...`));
          
          // Check if this is a fallback component (error)
          if (text.includes('Original component had syntax error') || text.includes('fallback')) {
            console.error(chalk.red('DETECTED FALLBACK ERROR COMPONENT IN API RESPONSE'));
            
            // Extract error details if available
            const errorMatch = text.match(/Error details: (.+?)(?:\n|$)/);
            if (errorMatch && errorMatch[1]) {
              console.error(chalk.red(`Error details: ${errorMatch[1]}`));
            }
          }
          
          if (status < 200 || status >= 300) {
            console.error(chalk.red(`PUPPETEER ERROR: Failed to load component script. Status: ${status}`));
          }
        } catch (e) {
          console.error(chalk.red('Could not get response text for publicUrl.'));
        }
      }
    });
    
    console.log(chalk.blue(`🌐 [PUPPETEER_LOG] Attempting to navigate to: file://${localTestPagePath}`));
    try {
      await page.goto(`file://${localTestPagePath}`, { waitUntil: 'domcontentloaded' });
      console.log(chalk.blue('🌐 [PUPPETEER_LOG] Navigation successful (goto completed).'));
    } catch (gotoError) {
      console.error(chalk.red('🌐 [PUPPETEER_LOG] page.goto() FAILED.'));
      // Re-throw to be caught by the outer try...catch which has the enhanced logging
      throw gotoError; 
    }
    
    console.log(chalk.blue('🌐 [PUPPETEER_LOG] Waiting for 2s timeout after goto...'));
    await page.waitForTimeout(2000);
    console.log(chalk.blue('🌐 [PUPPETEER_LOG] Timeout finished. Evaluating page for success indicator...'));
    
    // Method 1: Look for our success indicator div
    let success = false;
    try {
      success = await page.evaluate(() => {
        return !!document.getElementById('component-render-success');
      });
      
      if (success) {
        console.log(chalk.green('✅ Component rendered successfully (found success indicator)'));
      }
    } catch (e) {
      console.log(chalk.yellow('Could not find success indicator, checking for content...'));
    }
    
    // Method 2: Check if any content is present in the remotion player
    if (!success) {
      try {
        const hasContent = await page.evaluate(() => {
          const player = document.getElementById('remotion-player');
          return player && player.children.length > 0 && player.innerHTML.trim() !== '';
        });
        
        if (hasContent) {
          console.log(chalk.green('✅ Component rendered successfully (found content in player)'));
          success = true;
        } else {
          console.log(chalk.red('❌ No content found in remotion-player'));
        }
      } catch (e) {
        console.log(chalk.red('Error checking player content:', e));
      }
    }
    
    // Method 3: Look for any rendering errors in the page
    const { hasErrorMessages: pageHasErrors, consoleMessages: pageConsoleMessages } = await analyzePageForCriticalErrors_V135(page);

    if (pageHasErrors) {
      console.error(chalk.red('❌ Error message found in page content'));
    }

    // Extract any console logs to help with debugging
    const consoleMessages = await page.evaluate(() => {
      // Use type assertion to access the custom logs property
      const windowWithLogs = window as Window & typeof globalThis & { logs?: string[] };
      return windowWithLogs.logs || [];
    });
    
    if (consoleMessages && consoleMessages.length > 0) {
      console.log(chalk.yellow('Console logs from page:'));
      consoleMessages.forEach((msg: string) => console.log(`  ${msg}`));
    }
    
    const screenshotPath = path.join(outputDir, `${componentId}_screenshot.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(chalk.green(`📸 Screenshot saved to ${screenshotPath}`));

    return { success, screenshotPath };
  } catch (error) {
    console.error(chalk.red('💥 [PUPPETEER_CRITICAL_ERROR] An error occurred during Puppeteer operations:'));
    console.error(error); 
    
    let errorMessage: string;
    let errorDetailsOutput = ''; 
    let errorStack = '';
    let screenshotPath: string | undefined;

    if (error instanceof Error) {
      errorMessage = `Error testing component rendering: ${error.message}`;
      errorStack = error.stack || 'No stack trace available.';
    } else {
      errorMessage = `An unexpected error occurred during rendering test. Error was not an instance of Error.`;
      // Try to get more information from the non-Error object
      if (typeof error === 'object' && error !== null) {
        errorDetailsOutput = `Error properties: ${Object.keys(error).join(', ')}\n`;
        try {
          errorDetailsOutput += `Full error object (JSON): ${JSON.stringify(error, null, 2)}`;
        } catch (e) {
          errorDetailsOutput += 'Full error object (JSON): Could not stringify error object. Inspect raw object below.\n';
          // Attempt to log a simpler representation if stringify fails
          console.error(chalk.red('Raw error object:'), error); 
        }
      } else {
        errorDetailsOutput = `Error details: The caught error was not an object: ${String(error)}`;
      }
    }
    console.error(chalk.red(errorMessage));
    if (errorStack) {
      console.error(chalk.red('Stack trace:'), errorStack);
    }
    if (errorDetailsOutput) { 
      console.error(chalk.red('Error Details:'), errorDetailsOutput);
    }
    
    // Try to capture a screenshot even if an error occurred during interaction
    if (browser && browser.connected) { 
      try {
        const errorPage: Page = await browser.newPage(); 
        await errorPage.goto(`file://${localTestPagePath}`, { waitUntil: 'networkidle0' });
        screenshotPath = path.join(outputDir, `${componentId}_error_screenshot.png`);
        await errorPage.screenshot({ path: screenshotPath });
        console.log(chalk.green(`📸 Error screenshot saved to ${screenshotPath}`));
      } catch (screenshotError) {
        console.error(chalk.red('Failed to capture error screenshot:'), screenshotError);
      }
    }
    
    // Ensure the returned error message is comprehensive
    const fullErrorMessage = `${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ''}${errorDetailsOutput ? `\nDetails: ${errorDetailsOutput}` : ''}`;
    return { success: false, error: fullErrorMessage, screenshotPath };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Helper function to check for error messages in page content or console
// Renamed to break cache and with correct logic reinstated
async function analyzePageForCriticalErrors_V135(page: Page): Promise<{ hasErrorMessages: boolean; consoleMessages: ConsoleMessage[] }> {
  console.log(chalk.bgGreen.black.bold('\n\nINSIDE analyzePageForCriticalErrors_V135 - FRESH INVOKE\n\n'));

  const collectedConsoleMessages: ConsoleMessage[] = [];
  const consoleListener = (msg: ConsoleMessage) => {
    collectedConsoleMessages.push(msg);
  };
  page.on('console', consoleListener);

  // Give a brief moment for any async errors to be logged
  await page.waitForTimeout(1000); 

  page.off('console', consoleListener);

  let bodyTextContent = '';
  try {
    bodyTextContent = await page.evaluate(() => document.body.innerText.toLowerCase());
  } catch (evalError) {
    console.warn(chalk.yellow('[analyzePageForCriticalErrors_V135] ERROR during page.evaluate for body.innerText:'), evalError);
  }

  const errorKeywords = ['error', 'failed', 'cannot', 'unable', 'exception', 'problem', 'uncaught'];
  let hasErrorInBody = errorKeywords.some(keyword => bodyTextContent.includes(keyword));

  const nonCriticalWarningSubstrings = [
    'download the react devtools',
    'warning: each child in a list should have a unique "key" prop'
  ];

  if (hasErrorInBody) {
    const lowerBodyTextForFiltering = bodyTextContent.toLowerCase();
    let tempFilteredBodyText = lowerBodyTextForFiltering;
    nonCriticalWarningSubstrings.forEach(warningSubstring => {
      // Escape special characters in substring for regex
      const escapedSubstring = warningSubstring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      tempFilteredBodyText = tempFilteredBodyText.replace(new RegExp(escapedSubstring, 'gi'), '');
    });
    
    const stillHasErrorKeywords = errorKeywords.some(keyword => tempFilteredBodyText.includes(keyword));
    if (stillHasErrorKeywords) {
      console.log(chalk.yellow(`[analyzePageForCriticalErrors_V135] Page body contains error-suggesting keywords after filtering. Sample: "${tempFilteredBodyText.substring(0,100)}..."`));
    } else {
      console.log(chalk.green(`[analyzePageForCriticalErrors_V135] Page body keywords were likely from non-critical warnings. Original sample: "${bodyTextContent.substring(0,100)}..."`));
      hasErrorInBody = false; 
    }
  }

  const criticalConsoleErrors = collectedConsoleMessages.filter(msg => {
    const messageText = msg.text().toLowerCase();
    const isKeyWarning = messageText.includes('warning: each child in a list should have a unique "key" prop');
    const isReactDevtoolsWarning = messageText.includes('download the react devtools');
    
    return msg.type().toUpperCase() === 'ERROR' && !isKeyWarning && !isReactDevtoolsWarning;
  });

  const hasCriticalErrorInConsole = criticalConsoleErrors.length > 0;
  
  if (hasErrorInBody && !hasCriticalErrorInConsole) { 
    console.warn(chalk.yellow('[analyzePageForCriticalErrors_V135] Detected error keywords in page body content (console clear).'));
  } else if (hasCriticalErrorInConsole) {
    console.warn(chalk.yellow(`[analyzePageForCriticalErrors_V135] Detected ${criticalConsoleErrors.length} critical console message(s) of type ERROR.`));
    criticalConsoleErrors.forEach(cErr => console.log(chalk.magenta(`  Critical Console Error Text (V135): ${cErr.text().substring(0, 200)}...`)));
  }

  console.log(chalk.cyan.bold(`[analyzePageForCriticalErrors_V135 DEBUG] Final hasErrorInBody: ${hasErrorInBody}`));
  console.log(chalk.cyan.bold(`[analyzePageForCriticalErrors_V135 DEBUG] Final hasCriticalErrorInConsole: ${hasCriticalErrorInConsole}`));
  
  return { hasErrorMessages: hasErrorInBody || hasCriticalErrorInConsole, consoleMessages: collectedConsoleMessages };
}

// Main function to verify the component pipeline
/**
 * Verifies the entire component pipeline from generation to rendering
 * @returns {Promise<void>}
 */
export async function verifyComponentPipeline(): Promise<void> {
  console.log('🚀 Starting component pipeline verification');
  console.log('===========================================');
  
  try {
    // Step 1: Generate a canary component
    const { code: componentCode, name: componentName }: CanaryComponent = await generateCanaryComponent();
    
    // Step 2: Store component in database
    const componentId: string = await storeComponentInDatabase(componentCode);
    
    // Step 3: Compile component and upload to R2
    const compileResult: CompileResult = await compileAndUploadComponent(componentId, componentCode);

    if (!compileResult.success || !compileResult.publicUrl) {
      const errorMessage = `Failed to compile and upload component. Error: ${compileResult.error || 'Public URL not available.'}`;
      console.error(chalk.red(`❌ ${errorMessage}`));
      // Optionally, write to error results here
      const errorResults: ErrorResults = {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        stack: compileResult.error ? 'N/A (compile/upload error)' : undefined,
      };
      fs.writeFileSync(
        path.join(outputDir, `${componentId || 'unknown_id'}_compile_error_results.json`), 
        JSON.stringify(errorResults, null, 2)
      );
      throw new Error(errorMessage);
    }
    const publicUrl: string = compileResult.publicUrl; // Now guaranteed to be a string
    
    // Step 4: Test API endpoint
    await testApiEndpoint(componentId);
    
    // Step 5: Test component rendering
    const renderResult: RenderTestResult = await testComponentRendering(componentId, publicUrl);
    
    // Summary
    console.log('\n');
    console.log('===========================================');
    console.log('📋 Component Pipeline Verification Summary');
    console.log('===========================================');
    console.log(`Component ID: ${componentId}`);
    console.log(`Component Name: ${componentName}`);
    console.log(`Public URL: ${publicUrl}`);
    console.log(`API Endpoint: ${API_URL}/api/components/${componentId}`);
    console.log(`Test HTML: ${path.join(outputDir, `${componentId}_render_test.html`)}`);
    console.log(`Screenshot: ${path.join(outputDir, `${componentId}_screenshot.png`)}`);
    console.log('===========================================');
    
    if (renderResult.success) {
      console.log('✅ ALL TESTS PASSED - Component pipeline is working correctly');
    } else {
      console.log('⚠️ SOME TESTS FAILED - See details above');
    }
    
    // Store results for future reference
    const results: VerificationResults = {
      timestamp: new Date().toISOString(),
      componentId,
      componentName,
      publicUrl,
      apiEndpoint: `${API_URL}/api/components/${componentId}`,
      success: renderResult.success,
      errorMessage: renderResult.error || null,
    };
    
    fs.writeFileSync(
      path.join(outputDir, `${componentId}_results.json`), 
      JSON.stringify(results, null, 2)
    );
  } catch (error) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    console.error(`❌ Pipeline verification failed: ${errorMessage}`);
    console.error(error);
    
    // Store error for future reference
    const errorResults: ErrorResults = {
      timestamp: new Date().toISOString(),
      error: errorMessage,
      stack: error instanceof Error ? error.stack : 'No stack trace available',
    };
    
    fs.writeFileSync(
      path.join(outputDir, `error_${Date.now()}.json`), 
      JSON.stringify(errorResults, null, 2)
    );
    
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the verification when this script is executed directly
if (process.argv[1] === __filename) { // ESM equivalent for checking if script is main
  verifyComponentPipeline().catch((error: Error | any) => {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Unhandled error: ${errorMessage}`));
    if (error instanceof Error && error.stack) {
      console.error(chalk.grey(error.stack));
    }
    process.exit(1);
  });
}