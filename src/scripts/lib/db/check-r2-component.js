import {
  getComponentById,
  parseArgs,
  ensureAnalysisDirectories,
  closeConnection,
  R2_PUBLIC_URL
} from './db-utils.js';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import path from 'path';
import https from 'https';

/**
 * @typedef {object} Component
 * @property {string} id
 * @property {string} status
 * @property {string} [outputUrl]
 */

/**
 * Check if a component exists in R2 storage
 */
async function checkR2Component() {
  try {
    // Parse command line arguments
    const args = parseArgs();
    const componentId = args.positional[0];
    
    if (!componentId) {
      console.error('Please provide a component ID');
      console.error('Usage: node check-r2-component.js <componentId>');
      process.exit(1);
    }
    
    console.log(`\n=== Checking R2 Storage for Component ===`);
    console.log(`Component ID: ${componentId}`);
    
    // Get component details
    /** @type {Component | null} */
    const component = /** @type {Component | null} */ (await getComponentById(componentId));
    
    if (!component) {
      console.error(`Component with ID ${componentId} not found in database`);
      process.exit(1);
    }
    
    console.log(`\n=== Component Database Details ===`);
    console.log(`- ID: ${component.id}`);
    console.log(`- Status: ${component.status}`);
    console.log(`- Output URL: ${component.outputUrl || 'None'}`);
    
    // Check if the component has an output URL
    if (!component.outputUrl) {
      console.log(`\n❌ Component does not have an output URL in the database`);
      return;
    }
    
    // Extract the R2 path from the URL
    let r2Path;
    try {
      r2Path = component.outputUrl.replace(R2_PUBLIC_URL, '');
      console.log(`- R2 Path: ${r2Path}`);
    } catch (err) {
      console.log(`\n❌ Could not parse R2 path from URL: ${component.outputUrl}`);
      return;
    }
    
    // Check if the component exists in R2
    
    try {
      const exists = await checkUrlExists(component.outputUrl);
      
      if (exists) {
        console.log(`\n✅ Component exists in R2 storage!`);
        console.log(`URL: ${component.outputUrl}`);
        
        // Attempt to download the file
        const outputDir = path.join(process.cwd(), 'analysis', 'r2', componentId);
        
        try {
          await fsPromises.mkdir(outputDir, { recursive: true });
        } catch (err) {
          // Directory exists, ignore
          // Optional: check if err.code === 'EEXIST' if more specific handling is needed
        }
        
        const outputFile = path.join(outputDir, `${componentId}.js`);
        await downloadFile(component.outputUrl, outputFile);
        console.log(`\nComponent file downloaded to: ${outputFile}`);
      } else {
        console.log(`\n❌ Component does not exist in R2 storage`);
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(`\n❌ Error checking R2 storage: ${err.message}`);
      } else {
        console.error(`\n❌ Error checking R2 storage: ${String(err)}`);
      }
    }
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error checking R2 component:', error.message);
    } else {
      console.error('Error checking R2 component:', String(error));
    }
  } finally {
    await closeConnection();
  }
}

/**
 * Check if a URL exists by making a HEAD request
 * @param {string} url 
 * @returns {Promise<boolean>}
 */
function checkUrlExists(url) {
  return new Promise((resolve) => {
    const request = https.request(
      url,
      { method: 'HEAD' },
      (response) => {
        resolve(response.statusCode === 200);
      }
    );
    
    request.on('error', () => {
      resolve(false);
    });
    
    request.end();
  });
}

/**
 * Download a file from a URL
 * @param {string} url 
 * @param {string} outputPath 
 * @returns {Promise<void>}
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download: ${response.statusCode}`));
      }
      
      const file = fs.createWriteStream(outputPath);
      response.pipe(file);
      
      file.on('finish', () => {
        file.close(); 
        resolve();
      });
      
      file.on('error', (err) => {
        try {
          fs.unlinkSync(outputPath);
        } catch (unlinkErr) {
          if (unlinkErr instanceof Error) {
            console.error(`Error unlinking file during error handling: ${unlinkErr.message}`);
          } else {
            console.error(`Error unlinking file during error handling: ${String(unlinkErr)}`);
          }
        }
        reject(err);
      });
    }).on('error', reject);
  });
}

checkR2Component(); 