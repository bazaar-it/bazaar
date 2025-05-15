// src/scripts/component-tools/esm-compat.js
// Helper module for ESM/CommonJS compatibility

/**
 * Utility to determine if we are in ESM or CommonJS context and provide appropriate import
 * 
 * @param {string} modulePath - The module path to import
 * @returns {Promise<any>} - The imported module
 */
export async function importModule(modulePath) {
  try {
    // Try ESM import first
    return await import(modulePath);
  } catch (err) {
    if (err.code === 'ERR_REQUIRE_ESM') {
      // If it's an ESM module but we're in CommonJS, use dynamic import
      return await import(modulePath);
    } else if (err.code === 'ERR_MODULE_NOT_FOUND') {
      // If module not found in ESM context, try CommonJS require
      try {
        // Dynamic require to avoid static analysis issues
        const requireFn = eval('require');
        return requireFn(modulePath);
      } catch (requireErr) {
        console.error(`Failed to import module ${modulePath}:`, requireErr);
        throw requireErr;
      }
    } else {
      console.error(`Error importing ${modulePath}:`, err);
      throw err;
    }
  }
}

/**
 * Run a script with appropriate Node options for ESM/CommonJS compatibility
 * 
 * @param {string} scriptPath - Path to the script to run
 * @param {Array<string>} args - Arguments to pass to the script
 * @returns {Promise<void>}
 */
export async function runScript(scriptPath, args = []) {
  const { spawn } = await importModule('child_process');
  
  return new Promise((resolve, reject) => {
    const nodeOptions = process.env.NODE_OPTIONS || '';
    process.env.NODE_OPTIONS = `${nodeOptions} --experimental-specifier-resolution=node`;
    
    const scriptProcess = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      env: process.env
    });
    
    scriptProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
    
    scriptProcess.on('error', (err) => {
      reject(err);
    });
  });
}

// Export a function to determine if the current context is ESM
export function isESM() {
  return typeof require === 'undefined';
}

// Export a helper for conditionally handling imports in dual ESM/CJS environments
export async function dynamicImport(esmPath, cjsPath) {
  try {
    if (isESM()) {
      return await import(esmPath);
    } else {
      const requireFn = eval('require');
      return requireFn(cjsPath || esmPath);
    }
  } catch (err) {
    console.error('Import error:', err);
    throw err;
  }
}
