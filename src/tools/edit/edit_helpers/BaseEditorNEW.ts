
import type { CodeGenerationOutput } from "~/tools/helpers/types";

/**
 * Base editor class providing common functionality for all editing operations
 */
export abstract class BaseEditor {
  protected readonly DEBUG = process.env.NODE_ENV === 'development';



  /**
   * Extract function name from existing code
   */
  protected extractFunctionName(code: string): string {
    const match = code.match(/export\s+default\s+function\s+(\w+)/);
    return match?.[1] || 'EditedScene';
  }

  /**
   * Validate that the edited code is syntactically correct
   */
  protected validateCode(code: string): { isValid: boolean; error?: string } {
    try {
      console.log('==================== baseEditor reached:');
      // Basic validation - check for required Remotion imports and export
      if (!code.includes('export default function')) {
        return { isValid: false, error: 'Missing export default function' };
      }
      
      if (!code.includes('Remotion') && !code.includes('AbsoluteFill')) {
        return { isValid: false, error: 'Missing Remotion imports' };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Abstract method that subclasses must implement
   */
  abstract executeEdit(input: any): Promise<CodeGenerationOutput>;
}
