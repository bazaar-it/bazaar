import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import fetch from 'node-fetch';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { createInterface } from 'readline';
const require = createRequire(import.meta.url);
require('dotenv').config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env.local') });

// Connection credentials
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g-pooler.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';

// R2 credentials
const R2_ENDPOINT = process.env.R2_ENDPOINT || 'https://3a37cf04c89e7483b59120fb95af6468.r2.cloudflarestorage.com';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'bazaar-vid-components';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Create clients
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
});

// Create R2 client
const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Function to check if a component exists in R2
async function checkR2Existence(componentId) {
  try {
    console.log(`\nChecking R2 for component: ${componentId}`);
    
    // Path in R2 bucket
    const publicPath = `custom-components/${componentId}.js`;
    
    // Use HeadObject to check if the file exists
    const headResult = await r2.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: publicPath,
      })
    );
    
    if (headResult.$metadata.httpStatusCode === 200) {
      console.log(`✅ Component exists in R2: ${publicPath}`);
      return { exists: true, size: headResult.ContentLength };
    } else {
      console.log(`⚠️ Component check returned unexpected status: ${headResult.$metadata.httpStatusCode}`);
      return { exists: false };
    }
  } catch (error) {
    const isNotFound = error.name === 'NotFound' || 
                        error.$metadata?.httpStatusCode === 404 ||
                        error.message?.includes('404');
                        
    if (isNotFound) {
      console.log(`❌ Component does not exist in R2`);
      return { exists: false, reason: 'Not Found' };
    } else {
      console.error(`❌ Error checking R2: ${error.message || error}`);
      return { exists: false, error: error.message || String(error) };
    }
  }
}

// Function to find components with "success" status in the database
async function findSuccessComponents(limit = 100) {
  try {
    console.log('\n🔍 Finding components with "success" status...');
    
    const client = await pool.connect();
    const result = await client.query(
      `SELECT id, effect, status, "outputUrl", "tsxCode", "createdAt", "updatedAt"
       FROM "bazaar-vid_custom_component_job"
       WHERE status = 'success'
       ORDER BY "updatedAt" DESC
       LIMIT $1`,
      [limit]
    );
    client.release();
    
    console.log(`✅ Found ${result.rows.length} components with "success" status`);
    return result.rows;
  } catch (error) {
    console.error(`❌ Error finding components: ${error.message || error}`);
    throw error;
  }
}

// Function to filter components that don't exist in R2
async function filterMissingComponents(components) {
  console.log('\n🔍 Checking which components are missing from R2...');
  
  const results = {
    missing: [],
    existing: [],
    errors: []
  };
  
  for (const component of components) {
    try {
      const r2Check = await checkR2Existence(component.id);
      
      if (r2Check.exists) {
        results.existing.push({
          ...component,
          r2Size: r2Check.size
        });
      } else {
        results.missing.push(component);
      }
    } catch (error) {
      console.error(`❌ Error checking R2 for ${component.id}: ${error.message || error}`);
      results.errors.push({
        component,
        error: error.message || String(error)
      });
    }
  }
  
  console.log(`✅ Found ${results.missing.length} missing components, ${results.existing.length} existing, ${results.errors.length} errors`);
  return results;
}

// Function to wrap component code with global references and window.__REMOTION_COMPONENT assignment
function wrapComponentCode(componentCode, componentName) {
  return `
// Component fixed with migration script

// Using globals provided by Remotion environment
const React = window.React;
const { 
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  interpolate,
  Easing
} = window.Remotion || {};

${componentCode}

// CRITICAL: Register component for Remotion
window.__REMOTION_COMPONENT = ${componentName || 'undefined'};

// Fallback registration if component name is wrong
(function() {
  try {
    if (typeof ${componentName} === 'undefined') {
      // Component not found with expected name, try to find it
      for (const key in window) {
        if (key !== 'React' && 
            key !== 'Remotion' && 
            typeof window[key] === 'function' && 
            window[key].toString().includes('return React.createElement')) {
          console.log('Found component:', key);
          window.__REMOTION_COMPONENT = window[key];
          break;
        }
      }
    }
    
    // Create fallback if still not found
    if (!window.__REMOTION_COMPONENT) {
      window.__REMOTION_COMPONENT = (props) => {
        return React.createElement('div', {
          style: {
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
            padding: '20px',
            borderRadius: '8px',
            color: 'red'
          }
        }, [
          React.createElement('h2', null, 'Component Error'),
          React.createElement('p', null, 'The component could not be found')
        ]);
      };
    }
  } catch (error) {
    console.error('Error in component registration:', error);
  }
})();
  `;
}

// Function to upload a component to R2
async function uploadComponentToR2(componentId, componentCode) {
  try {
    console.log(`\n📤 Uploading component ${componentId} to R2...`);
    
    // Determine component name
    const componentNameMatch = componentCode.match(/(?:function|const|let|var)\s+([A-Za-z0-9_]+)\s*(?:=|\()/);
    const componentName = componentNameMatch ? componentNameMatch[1] : 'Component';
    console.log(`Component name identified as: ${componentName}`);
    
    // Wrap the component code with global references
    const wrappedCode = wrapComponentCode(componentCode, componentName);
    
    // Path in R2 bucket
    const publicPath = `custom-components/${componentId}.js`;
    const publicUrl = `${R2_PUBLIC_URL}/${publicPath}`;
    
    // Upload to R2
    const uploadResult = await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: publicPath,
        Body: wrappedCode,
        ContentType: 'application/javascript',
      })
    );
    
    console.log(`✅ Component uploaded to R2: ${publicUrl}`);
    
    // Verify upload
    const verifyResult = await checkR2Existence(componentId);
    if (verifyResult.exists) {
      console.log(`✅ Upload verified: ${verifyResult.size} bytes`);
      return { success: true, url: publicUrl };
    } else {
      console.error(`❌ Upload verification failed!`);
      return { success: false, error: 'Verification failed' };
    }
  } catch (error) {
    console.error(`❌ Error uploading component: ${error.message || error}`);
    return { success: false, error: error.message || String(error) };
  }
}

// Function to update component in database
async function updateComponentInDatabase(componentId, publicUrl) {
  try {
    console.log(`\n🔄 Updating component ${componentId} in database...`);
    
    const client = await pool.connect();
    const result = await client.query(
      `UPDATE "bazaar-vid_custom_component_job"
       SET status = 'complete', "outputUrl" = $1, "updatedAt" = NOW()
       WHERE id = $2
       RETURNING id, status, "outputUrl"`,
      [publicUrl, componentId]
    );
    client.release();
    
    if (result.rows.length > 0) {
      console.log(`✅ Database updated: ${result.rows[0].status}, ${result.rows[0].outputUrl}`);
      return { success: true, component: result.rows[0] };
    } else {
      console.error(`❌ Component not found in database!`);
      return { success: false, error: 'Component not found' };
    }
  } catch (error) {
    console.error(`❌ Error updating database: ${error.message || error}`);
    return { success: false, error: error.message || String(error) };
  }
}

// Function to generate a fallback component when the original code is missing
function generateFallbackComponent(componentId) {
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

// Function to get components with status 'complete' but missing in R2
async function findMissingComponents() {
  try {
    const query = `
      SELECT id, effect, status, "tsxCode", "outputUrl", "updatedAt"
      FROM "bazaar-vid_custom_component_job"
      WHERE status = 'complete'
    `;
    
    const result = await pool.query(query);
    const components = result.rows;
    
    console.log(chalk.blue(`Found ${components.length} components with 'complete' status`));
    
    // Filter to find only components missing in R2
    const missingComponents = [];
    
    for (const component of components) {
      const exists = await checkR2Existence(component.id);
      
      if (!exists) {
        missingComponents.push(component);
        console.log(chalk.yellow(`Component ${component.id} (${component.effect}) is missing in R2`));
      }
    }
    
    return missingComponents;
  } catch (error) {
    console.error(chalk.red(`Error finding missing components: ${error.message}`));
    throw error;
  }
}

// Function to ask user for confirmation
function askQuestion(question) {
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

// Main function to fix missing components
async function fixMissingComponents() {
  console.log(chalk.green('🔍 Starting missing components fix tool'));
  console.log('=============================================');
  
  try {
    // Find components with "success" status
    const successComponents = await findSuccessComponents();
    
    // Check which components are missing from R2
    const { missing, existing, errors } = await filterMissingComponents(successComponents);
    
    // Create report directories
    const reportsDir = path.join(__dirname, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    // Save report of all components
    await fs.writeFile(
      path.join(reportsDir, 'component-status.json'),
      JSON.stringify({ 
        timestamp: new Date().toISOString(),
        total: successComponents.length,
        missing: missing.length,
        existing: existing.length,
        errors: errors.length
      }, null, 2)
    );
    
    console.log('\n📊 Component Status Summary:');
    console.log(`Total "success" components: ${successComponents.length}`);
    console.log(`Missing from R2: ${missing.length}`);
    console.log(`Exist in R2: ${existing.length}`);
    console.log(`Errors during check: ${errors.length}`);
    
    if (missing.length === 0) {
      console.log(chalk.green('✅ No missing components found! Everything is in sync.'));
      return;
    }
    
    // Ask for confirmation
    const shouldFix = await askQuestion(`Do you want to fix all ${missing.length} missing components?`);
    
    if (!shouldFix) {
      console.log(chalk.blue('❌ Operation cancelled by user.'));
      return;
    }
    
    // Fix missing components
    console.log(chalk.blue('🔧 Fixing missing components...'));
    
    const fixResults = {
      successful: [],
      failed: []
    };
    
    for (const component of missing) {
      console.log(chalk.blue(`Processing component ${component.id} (${component.effect})...`));
      
      try {
        // Generate a simple fallback component if the TSX code is missing
        const componentCode = component.tsxCode || generateFallbackComponent(component.id);
        
        // Upload to R2
        const uploadResult = await uploadComponentToR2(component.id, componentCode);
        
        if (uploadResult.success) {
          // Update database
          const dbResult = await updateComponentInDatabase(component.id, uploadResult.url);
          
          if (dbResult.success) {
            fixResults.successful.push({
              id: component.id,
              newUrl: uploadResult.url
            });
          } else {
            fixResults.failed.push({
              id: component.id,
              reason: `Database update failed: ${dbResult.error}`
            });
          }
        } else {
          fixResults.failed.push({
            id: component.id,
            reason: `Upload failed: ${uploadResult.error}`
          });
        }
      } catch (error) {
        console.error(chalk.red(`Error fixing component ${component.id}: ${error.message}`));
        fixResults.failed.push({
          id: component.id,
          reason: `Error fixing missing component: ${error.message}`
        });
      }
    }
    
    // Save fix results
    await fs.writeFile(
      path.join(reportsDir, 'fix-results.json'),
      JSON.stringify({ 
        timestamp: new Date().toISOString(),
        attempted: missing.length,
        successful: fixResults.successful.length,
        failed: fixResults.failed.length,
        details: {
          successful: fixResults.successful,
          failed: fixResults.failed
        }
      }, null, 2)
    );
    
    console.log('=============================================');
    console.log(chalk.green(`📊 Fix operation completed`));
    console.log(chalk.green(`   - Fixed: ${fixResults.successful.length}/${missing.length}`));
    
    if (fixResults.failed.length > 0) {
      console.log(chalk.red(`   - Failed: ${fixResults.failed.length}`));
      console.log('\n❌ Some components could not be fixed:');
      fixResults.failed.forEach(failure => {
        console.log(`- ${failure.id}: ${failure.reason}`);
      });
    }
    
    console.log(`\n✅ Report saved to ${path.join(reportsDir, 'fix-results.json')}`);
    
  } catch (error) {
    console.error(chalk.red(`Unhandled error: ${error.message}`));
    if (error.stack) {
      console.error(chalk.grey(error.stack));
    }
  } finally {
    // Close database connection
    await pool.end();
    console.log('\n=== 🏁 REPAIR COMPLETE ===');
  }
}

// Run the fix
fixMissingComponents(); 