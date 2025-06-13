import { addTool } from "./add/add";
import { editTool } from "./edit/edit";
import { deleteTool } from "./delete/delete";
import type { 
  AddToolInput, 
  EditToolInput, 
  DeleteToolInput,
  BaseToolOutput 
} from "./helpers/types";

/**
 * Unified Scene Builder - Main interface for all scene operations
 * Routes requests to appropriate specialized tools
 */
export class SceneBuilderNEW {
  /**
   * Add a new scene to the project
   */
  async addScene(input: AddToolInput): Promise<BaseToolOutput> {
    try {
      console.log('==================== scenebuilder reached:');
      console.log('==================== addScene started:');
      const result = await addTool.run(input);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Add operation failed');
      }
      
      return result.data!;
    } catch (error) {
      return {
        success: false,
        reasoning: `Add scene failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Edit an existing scene
   */
  async editScene(input: EditToolInput): Promise<BaseToolOutput> {
    try {
      console.log('==================== scenebuilder reached:');
      console.log('==================== editScene started:');
      const result = await editTool.run(input);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Edit operation failed');
      }
      
      return result.data!;
    } catch (error) {
      return {
        success: false,
        reasoning: `Edit scene failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a scene from the project
   */
  async deleteScene(input: DeleteToolInput): Promise<BaseToolOutput> {
    try {
      console.log('==================== scenebuilder reached:');
      console.log('==================== deleteScene started:');
      const result = await deleteTool.run(input);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Delete operation failed');
      }
      
      return result.data!;
    } catch (error) {
      return {
        success: false,
        reasoning: `Delete scene failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get available tools information
   */
  getAvailableTools() {
    return {
      add: {
        name: addTool.name,
        description: addTool.description,
        inputSchema: addTool.inputSchema,
      },
      edit: {
        name: editTool.name,
        description: editTool.description,
        inputSchema: editTool.inputSchema,
      },
      delete: {
        name: deleteTool.name,
        description: deleteTool.description,
        inputSchema: deleteTool.inputSchema,
      },
    };
  }
}

// Export singleton instance
export const sceneBuilderNEW = new SceneBuilderNEW();

// Export individual tools for convenience
export { addTool } from "./add/add";
export { editTool } from "./edit/edit";
export { deleteTool } from "./delete/delete";
