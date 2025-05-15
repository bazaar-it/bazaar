//src/scripts/lib/components/component-manager.js
import { getDb } from '../db/utils.js';
import { logger } from '../logger.js';

/**
 * Component Manager provides utilities for working with components
 */
export class ComponentManager {
  /**
   * Create a new ComponentManager
   * @param {Object} options - Options
   * @param {boolean} [options.dryRun=false] - Whether operations are done in dry-run mode
   */
  constructor({ dryRun = false } = {}) {
    this.dryRun = dryRun;
    this.logger = logger;
  }

  /**
   * Get components by status
   * @param {string} status - Component status (e.g. 'failed', 'success', 'building')
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of components to fetch
   * @returns {Promise<Array>} - Components matching the status
   */
  async getComponentsByStatus(status, { limit } = {}) {
    try {
      const db = await getDb();
      
      // Adjust this query based on your actual database schema
      const components = await db.query(
        `SELECT * FROM "bazaar-vid_custom_component_job" 
         WHERE status = $1 
         ${limit ? 'LIMIT $2' : ''}`,
        limit ? [status, limit] : [status]
      );
      
      return components.rows;
    } catch (error) {
      this.logger.error('Failed to fetch components by status:', error);
      throw error;
    }
  }

  /**
   * Get a component by ID
   * @param {string} id - Component ID
   * @returns {Promise<Object|null>} - Component or null if not found
   */
  async getComponentById(id) {
    try {
      const db = await getDb();
      
      const result = await db.query(
        `SELECT * FROM "bazaar-vid_custom_component_job" WHERE id = $1 LIMIT 1`,
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`Failed to fetch component ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a component's status
   * @param {string} id - Component ID
   * @param {string} status - New status
   * @param {Object} [additionalFields={}] - Additional fields to update
   * @returns {Promise<Object>} - Updated component
   */
  async updateComponentStatus(id, status, additionalFields = {}) {
    if (this.dryRun) {
      this.logger.info(`[DRY-RUN] Would update component ${id} status to ${status}`);
      return { id, status, ...additionalFields };
    }
    
    try {
      const db = await getDb();
      
      // Build the SET clause dynamically
      const sets = ['status = $2'];
      const params = [id, status];
      
      Object.entries(additionalFields).forEach(([key, value], index) => {
        sets.push(`${key} = $${index + 3}`);
        params.push(value);
      });
      
      const result = await db.query(
        `UPDATE "bazaar-vid_custom_component_job" 
         SET ${sets.join(', ')}, "updatedAt" = NOW()
         WHERE id = $1 
         RETURNING *`,
        params
      );
      
      return result.rows[0];
    } catch (error) {
      this.logger.error(`Failed to update component ${id} status:`, error);
      throw error;
    }
  }

  /**
   * Fix common syntax issues in component code
   * @param {string} code - Component code
   * @returns {string} - Fixed code
   */
  fixComponentSyntax(code) {
    if (!code) return code;
    
    let fixed = code;
    
    // Fix missing export default
    if (!/(export\s+default|window\.__REMOTION_COMPONENT\s*=)/.test(fixed)) {
      const componentNameMatch = fixed.match(/function\s+([A-Za-z0-9_]+)/);
      const componentName = componentNameMatch ? componentNameMatch[1] : 'Component';
      
      fixed += `\n\nexport default ${componentName};\n`;
    }
    
    // Fix direct React imports
    fixed = fixed.replace(/import\s+React\s+from\s+['"]react['"];?/g, 
      '// Using window.React instead of import\n// import React from "react";');
    
    // Fix direct Remotion imports
    fixed = fixed.replace(/import\s+{\s*([^}]+)\s*}\s+from\s+['"]remotion['"];?/g, 
      '// Using window.Remotion instead of import\n// import { $1 } from "remotion";');
    
    return fixed;
  }
}
