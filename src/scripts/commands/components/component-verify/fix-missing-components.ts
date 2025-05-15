import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Pool } from 'pg';
import type { QueryResult } from 'pg';
import chalk from 'chalk';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createInterface } from 'readline';

// ESM-compatible __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env.local') });

// Environment variables
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

// Define interfaces
interface Component {
  id: string;
  effect: string;
  status: string;
  tsxCode: string | null;
  outputUrl: string | null;
  updatedAt: Date;
}

interface FixResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

interface FixSummary {
  successful: Array<{ id: string; publicUrl: string }>;
  failed: Array<{ id: string; reason: string }>;
}

interface FixReport {
  timestamp: string;
  total: number;
  fixed: number;
  failed: number;
  components: Array<{
    id: string;
    effect: string;
    hasCode: boolean;
    updatedAt: Date;
  }>;
}

/**
 * Checks if a component exists in R2 storage
 * @param {string} componentId - The component ID to check
 * @returns {Promise<boolean>} - Whether the component exists in R2
 */
async function checkComponentExistsInR2(componentId: string): Promise<boolean> {
  try {
    const key: string = `custom-components/${componentId}.js`;
    const command: HeadObjectCommand = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    
    await r2.send(command);
    return true;
  } catch (error: any) {
    // If we get a 404, the component doesn't exist
    if (error.name === 'NotFound') {
      return false;
    }
    
    // For any other error, propagate it
    throw error;
  }
}

/**
 * Uploads a component to R2 storage
 * @param {string} componentId - The component ID
 * @param {string} componentCode - The component code to upload
 * @returns {Promise<FixResult>} - The result of the upload
 */
async function uploadComponentToR2(componentId: string, componentCode: string): Promise<FixResult> {
  try {
    const key: string = `custom-components/${componentId}.js`;
    const command: PutObjectCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: componentCode,
      ContentType: 'application/javascript',
    });
    
    await r2.send(command);
    
    // Update the component URL in the database
    const publicUrl: string = `${R2_PUBLIC_URL}/${key}`;
    const updateQuery: string = `
      UPDATE "bazaar-vid_custom_component_job"
      SET "outputUrl" = $2,
          "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id
    `;
    
    const updateResult: QueryResult = await pool.query(updateQuery, [componentId, publicUrl]);
    
    if (updateResult.rows.length === 0) {
      return { success: false, error: 'Failed to update component URL in database' };
    }
    
    return { success: true, publicUrl };
  } catch (error: any) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Updates a component's status in the database
 * @param {string} componentId - The component ID
 * @param {string} status - The new status
 * @param {string} [errorMessage] - Optional error message
 * @returns {Promise<boolean>} - Whether the update was successful
 */
async function updateComponentStatus(componentId: string, status: string, errorMessage: string | null = null): Promise<boolean> {
  try {
    const updateQuery: string = `
      UPDATE "bazaar-vid_custom_component_job"
      SET status = $2,
          "errorMessage" = $3,
          "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id
    `;
    
    const result: QueryResult = await pool.query(updateQuery, [componentId, status, errorMessage]);
    return result.rows.length > 0;
  } catch (error: any) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error updating component status: ${errorMessage}`));
    return false;
  }
}

/**
 * Generates a fallback component when the original code is missing
 * @param {string} componentId - The component ID
 * @returns {string} - The fallback component code
 */
function generateFallbackComponent(componentId: string): string {
  return `
// Fallback component generated for missing component ID: ${componentId}
const React = window.React;
const { AbsoluteFill } = window.Remotion || {};

const FallbackComponent = (props) => {
  return React.createElement(AbsoluteFill, {
    style: {
      backgroundColor: 'rgba(200, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'system-ui, sans-serif',
      color: '#FF0000',
      padding: '2rem',
    }
  }, [
    React.createElement('h1', {
      key: 'title',
      style: {
        fontSize: '2rem',
        marginBottom: '1rem',
      }
    }, '⚠️ Fallback Component'),
    React.createElement('p', {
      key: 'info',
      style: {
        fontSize: '1rem',
        marginBottom: '1rem',
        textAlign: 'center',
      }
    }, 'Original component was missing in storage.'),
    React.createElement('p', {
      key: 'id',
      style: {
        fontSize: '0.8rem',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        padding: '0.5rem',
        borderRadius: '0.25rem',
      }
    }, \`Component ID: ${componentId}\`),
  ]);
};

// Register component for Remotion
window.__REMOTION_COMPONENT = FallbackComponent;
`;
}

/**
 * Gets components with status 'complete' but missing in R2
 * @returns {Promise<Array<Component>>} - Array of components
 */
async function findMissingComponents(): Promise<Array<Component>> {
  try {
    const query: string = `
      SELECT id, effect, status, "tsxCode", "outputUrl", "updatedAt"
      FROM "bazaar-vid_custom_component_job"
      WHERE status = 'complete'
    `;
    
    const result: QueryResult = await pool.query(query);
    const components: Array<Component> = result.rows;
    
    console.log(chalk.blue(`Found ${components.length} components with 'complete' status`));
    
    // Filter to find only components missing in R2
    const missingComponents: Array<Component> = [];
    
    for (const component of components) {
      const exists: boolean = await checkComponentExistsInR2(component.id);
      
      if (!exists) {
        missingComponents.push(component);
        console.log(chalk.yellow(`Component ${component.id} (${component.effect}) is missing in R2`));
      }
    }
    
    return missingComponents;
  } catch (error: any) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error finding missing components: ${errorMessage}`));
    throw error;
  }
}

/**
 * Ask user for confirmation
 * @param {string} question - The question to ask
 * @returns {Promise<boolean>} - User's answer
 */
function askQuestion(question: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${question} (y/n) `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log(chalk.green('🔍 Starting missing components fix tool'));
  console.log('=============================================');
  
  try {
    // Find missing components
    const missingComponents: Array<Component> = await findMissingComponents();
    
    if (missingComponents.length === 0) {
      console.log(chalk.green('✅ No missing components found! Everything is in sync.'));
      return;
    }
    
    console.log(chalk.yellow(`Found ${missingComponents.length} components missing in R2`));
    
    // Ask for confirmation
    const shouldFix: boolean = await askQuestion(`Do you want to fix all ${missingComponents.length} missing components?`);
    
    if (!shouldFix) {
      console.log(chalk.blue('❌ Operation cancelled by user.'));
      return;
    }
    
    // Fix each missing component
    console.log(chalk.blue('🔧 Fixing missing components...'));
    
    const fixResults: FixSummary = {
      successful: [],
      failed: []
    };
    
    for (const component of missingComponents) {
      console.log(chalk.blue(`Processing component ${component.id} (${component.effect})...`));
      
      try {
        // Generate a simple fallback component if the TSX code is missing
        const componentCode: string = component.tsxCode || generateFallbackComponent(component.id);
        
        // Upload to R2
        const uploadResult: FixResult = await uploadComponentToR2(component.id, componentCode);
        
        if (uploadResult.success && uploadResult.publicUrl) {
          console.log(chalk.green(`✅ Fixed component ${component.id}`));
          fixResults.successful.push({
            id: component.id,
            publicUrl: uploadResult.publicUrl
          });
        } else {
          console.log(chalk.red(`❌ Failed to fix component ${component.id}: ${uploadResult.error}`));
          fixResults.failed.push({
            id: component.id,
            reason: `Upload failed: ${uploadResult.error}`
          });
          
          // Mark as error in database
          await updateComponentStatus(component.id, 'error', `Failed to fix missing component: ${uploadResult.error}`);
        }
      } catch (error: any) {
        const errorMessage: string = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error fixing component ${component.id}: ${errorMessage}`));
        fixResults.failed.push({
          id: component.id,
          reason: `Error: ${errorMessage}`
        });
        
        // Mark as error in database
        await updateComponentStatus(component.id, 'error', `Error fixing missing component: ${errorMessage}`);
      }
    }
    
    // Print summary
    console.log('=============================================');
    console.log(chalk.green(`📊 Fix operation completed`));
    console.log(chalk.green(`   - Fixed: ${fixResults.successful.length} components`));
    
    if (fixResults.failed.length > 0) {
      console.log(chalk.red(`   - Failed: ${fixResults.failed.length} components`));
    }
    
    // Generate report
    const report: FixReport = {
      timestamp: new Date().toISOString(),
      total: missingComponents.length,
      fixed: fixResults.successful.length,
      failed: fixResults.failed.length,
      components: missingComponents.map(c => ({
        id: c.id,
        effect: c.effect,
        hasCode: !!c.tsxCode,
        updatedAt: c.updatedAt
      }))
    };
    
    const reportPath: string = path.join(outputDir, `fix_report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.green(`📝 Report saved to ${reportPath}`));
    
  } catch (error: any) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Unhandled error: ${errorMessage}`));
    if (error instanceof Error && error.stack) {
      console.error(chalk.grey(error.stack));
    }
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the main function
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(chalk.red(`Fatal error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  });
} 