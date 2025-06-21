//src/lib/evals/enhanced-runner.ts

import { EvaluationRunner, type DetailedEvalResult } from './runner';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { EvalPrompt } from './types';

export interface EnhancedEvalResult extends DetailedEvalResult {
  // Additional tracking
  brainReasoning?: {
    rawResponse: string;
    parsedDecision: any;
    toolSelected?: string;
    needsClarification?: boolean;
    clarificationQuestion?: string;
    editComplexity?: string;
  };
  
  // Chat history simulation
  chatHistoryProvided?: any[];
  contextUsed?: any;
  
  // Generated outputs
  generatedCode?: string;
  codeFileName?: string;
  
  // Timing breakdown
  timingBreakdown?: {
    brainThinking: number;
    toolExecution: number;
    codeGeneration: number;
    total: number;
  };
}

export class EnhancedEvaluationRunner extends EvaluationRunner {
  private outputDir: string;
  private sessionId: string;
  
  constructor() {
    super();
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
    this.outputDir = join(process.cwd(), 'eval-outputs', this.sessionId);
  }
  
  /**
   * 🎯 Enhanced evaluation with full output saving
   */
  async runEnhancedEvaluation(options: {
    suiteId: string;
    modelPacks: string[];
    saveOutputs?: boolean;
    includeContext?: boolean;
    maxPrompts?: number;
  }): Promise<{
    results: EnhancedEvalResult[];
    outputDirectory: string;
    summary: any;
  }> {
    console.log('\n🔬 Starting Enhanced Evaluation with Output Saving');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Create output directory
    if (options.saveOutputs !== false) {
      this.createOutputDirectory();
      console.log(`📁 Output directory: ${this.outputDir}`);
    }
    
    // Load suite
    const { getSuite } = await import('./registry');
    const suite = getSuite(options.suiteId);
    if (!suite) {
      throw new Error(`Suite ${options.suiteId} not found`);
    }
    
    const prompts = options.maxPrompts ? suite.prompts.slice(0, options.maxPrompts) : suite.prompts;
    console.log(`🧪 Testing ${prompts.length} prompts with ${options.modelPacks.length} model packs`);
    
    const enhancedResults: EnhancedEvalResult[] = [];
    
    // Test each prompt with each model pack
    for (const prompt of prompts) {
      console.log(`\n🎯 Testing: ${prompt.name}`);
      
      // Add chat history context for context-aware tests
      const enhancedPrompt = this.enhancePromptWithContext(prompt, options.includeContext);
      
      for (const modelPack of options.modelPacks) {
        console.log(`   📦 Model Pack: ${modelPack}`);
        
        try {
          const result = await this.runEnhancedSinglePrompt(enhancedPrompt, modelPack);
          enhancedResults.push(result);
          
          // Save outputs
          if (options.saveOutputs !== false) {
            await this.saveEvalOutput(result, prompt, modelPack);
          }
          
          // Display summary
          this.displayResultSummary(result);
          
        } catch (error) {
          console.error(`   ❌ Error: ${error}`);
          enhancedResults.push({
            promptId: prompt.id,
            prompt,
            modelPack,
            modelKey: 'error',
            provider: 'error',
            model: 'error',
            output: '',
            actualOutput: '',
            success: false,
            error: error instanceof Error ? error.message : String(error),
            metrics: {
              latency: 0,
              cost: 0,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    }
    
    // Generate comparison report
    if (options.saveOutputs !== false) {
      this.generateComparisonReport(enhancedResults, options.modelPacks);
    }
    
    const summary = this.generateEnhancedSummary(enhancedResults);
    
    return {
      results: enhancedResults,
      outputDirectory: this.outputDir,
      summary
    };
  }
  
  /**
   * 🎯 Enhanced single prompt evaluation
   */
  private async runEnhancedSinglePrompt(
    prompt: EvalPrompt,
    modelPack: string
  ): Promise<EnhancedEvalResult> {
    const startTime = Date.now();
    const timingBreakdown = {
      brainThinking: 0,
      toolExecution: 0,
      codeGeneration: 0,
      total: 0
    };
    
    // Run base evaluation with timing
    const brainStart = Date.now();
    const baseResult = await this.runSinglePrompt(prompt, modelPack, true);
    timingBreakdown.brainThinking = Date.now() - brainStart;
    
    // Extract brain reasoning
    let brainReasoning: any = undefined;
    if (baseResult.reasoning) {
      try {
        // Try to parse JSON reasoning (if brain returned JSON)
        const jsonMatch = baseResult.reasoning.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          brainReasoning = {
            rawResponse: baseResult.reasoning,
            parsedDecision: parsed,
            toolSelected: parsed.toolName || parsed.tool,
            needsClarification: parsed.needsClarification,
            clarificationQuestion: parsed.clarificationQuestion,
            editComplexity: parsed.editComplexity
          };
        }
      } catch (e) {
        // If not JSON, save raw reasoning
        brainReasoning = {
          rawResponse: baseResult.reasoning,
          parsedDecision: null
        };
      }
    }
    
    timingBreakdown.total = Date.now() - startTime;
    
    // Enhanced result with all details
    const enhancedResult: EnhancedEvalResult = {
      ...baseResult,
      brainReasoning,
      chatHistoryProvided: (prompt.input.context as any)?.chatHistory,
      contextUsed: prompt.input.context,
      generatedCode: baseResult.codeOutput,
      timingBreakdown
    };
    
    return enhancedResult;
  }
  
  /**
   * 🎯 Add simulated chat history to prompts
   */
  private enhancePromptWithContext(prompt: EvalPrompt, includeContext?: boolean): EvalPrompt {
    if (!includeContext || prompt.input.context?.chatHistory) {
      return prompt; // Already has context or not requested
    }
    
    // Add simulated chat history for context-aware testing
    const enhancedPrompt = { ...prompt };
    
    // Different context scenarios based on prompt ID
    if (prompt.id.includes('edit') || prompt.id.includes('modify')) {
      // Simulate previous scene creation context
      enhancedPrompt.input = {
        ...prompt.input,
        context: {
          ...prompt.input.context,
          chatHistory: [
            {
              role: 'user',
              content: 'create a welcome scene for my startup'
            },
            {
              role: 'assistant', 
              content: 'I\'ve created a beautiful welcome scene with a gradient background and fade-in animation for your startup. The scene displays "Welcome" with smooth animations.'
            },
            {
              role: 'user',
              content: prompt.input.text // Current prompt
            }
          ]
        }
      };
    } else if (prompt.id.includes('clarification')) {
      // Simulate ambiguous context
      enhancedPrompt.input = {
        ...prompt.input,
        context: {
          ...prompt.input.context,
          chatHistory: [
            {
              role: 'user',
              content: 'create something cool'
            },
            {
              role: 'assistant',
              content: 'I\'d be happy to help create something cool! Could you tell me more about what you have in mind? For example:\n- A specific type of animation or scene?\n- A product demo or company intro?\n- Any particular style or theme?'
            }
          ]
        }
      };
    }
    
    return enhancedPrompt;
  }
  
  /**
   * 📁 Create output directory structure
   */
  private createOutputDirectory(): void {
    // Create main directory
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
    
    // Create subdirectories
    const subdirs = ['code', 'reasoning', 'comparisons', 'reports'];
    subdirs.forEach(dir => {
      const path = join(this.outputDir, dir);
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    });
  }
  
  /**
   * 💾 Save evaluation outputs to files
   */
  private async saveEvalOutput(
    result: EnhancedEvalResult,
    prompt: EvalPrompt,
    modelPack: string
  ): Promise<void> {
    const sanitizedPromptId = prompt.id.replace(/[^a-z0-9-]/gi, '_');
    const baseFileName = `${sanitizedPromptId}_${modelPack}`;
    
    // Save brain reasoning
    if (result.brainReasoning) {
      const reasoningPath = join(this.outputDir, 'reasoning', `${baseFileName}.json`);
      writeFileSync(reasoningPath, JSON.stringify({
        promptId: prompt.id,
        promptName: prompt.name,
        modelPack,
        input: prompt.input.text,
        reasoning: result.brainReasoning,
        toolSelected: result.toolsUsed?.[0],
        needsClarification: result.brainReasoning.needsClarification,
        timing: result.timingBreakdown
      }, null, 2));
    }
    
    // Save generated code
    if (result.generatedCode) {
      const codePath = join(this.outputDir, 'code', `${baseFileName}.tsx`);
      
      // Add header comment with metadata
      const codeWithHeader = `// Evaluation Output
// Prompt: ${prompt.name}
// Model Pack: ${modelPack}
// Generated: ${new Date().toISOString()}
// Latency: ${result.metrics.latency}ms
// Cost: $${result.metrics.cost?.toFixed(4) || '0'}
// Input: ${prompt.input.text}

${result.generatedCode}`;
      
      writeFileSync(codePath, codeWithHeader);
      result.codeFileName = `${baseFileName}.tsx`;
    }
    
    // Save full result
    const fullResultPath = join(this.outputDir, `${baseFileName}_full.json`);
    writeFileSync(fullResultPath, JSON.stringify({
      ...result,
      promptDetails: prompt,
      timestamp: new Date().toISOString()
    }, null, 2));
  }
  
  /**
   * 📊 Generate comparison report
   */
  private generateComparisonReport(results: EnhancedEvalResult[], modelPacks: string[]): void {
    const reportPath = join(this.outputDir, 'reports', 'comparison_report.md');
    
    let report = `# Evaluation Comparison Report
Generated: ${new Date().toISOString()}
Session ID: ${this.sessionId}

## Summary
- Model Packs Tested: ${modelPacks.join(', ')}
- Total Tests: ${results.length}
- Successful Tests: ${results.filter(r => r.success).length}

## Detailed Comparisons

`;
    
    // Group results by prompt
    const byPrompt = new Map<string, EnhancedEvalResult[]>();
    results.forEach(result => {
      const key = result.promptId;
      if (!byPrompt.has(key)) {
        byPrompt.set(key, []);
      }
      byPrompt.get(key)!.push(result);
    });
    
    // Compare each prompt across model packs
    byPrompt.forEach((promptResults, promptId) => {
      const prompt = promptResults[0].prompt;
      report += `### ${prompt.name}
**Input**: ${prompt.input.text}

| Model Pack | Tool Selected | Clarification | Latency | Cost | Success |
|------------|---------------|---------------|---------|------|---------|
`;
      
      promptResults.forEach(result => {
        const tool = result.toolsUsed?.[0] || 'none';
        const clarification = result.brainReasoning?.needsClarification ? '✅' : '❌';
        const latency = `${result.metrics.latency}ms`;
        const cost = `$${result.metrics.cost?.toFixed(4) || '0'}`;
        const success = result.success ? '✅' : '❌';
        
        report += `| ${result.modelPack} | ${tool} | ${clarification} | ${latency} | ${cost} | ${success} |\n`;
      });
      
      // Add reasoning comparison
      report += '\n**Reasoning Comparison**:\n';
      promptResults.forEach(result => {
        if (result.brainReasoning?.toolSelected) {
          report += `- **${result.modelPack}**: Selected \`${result.brainReasoning.toolSelected}\``;
          if (result.brainReasoning.editComplexity) {
            report += ` (${result.brainReasoning.editComplexity})`;
          }
          report += '\n';
        }
      });
      
      // Add code file references
      const codeFiles = promptResults.filter(r => r.codeFileName).map(r => r.codeFileName);
      if (codeFiles.length > 0) {
        report += `\n**Generated Code Files**: ${codeFiles.join(', ')}\n`;
      }
      
      report += '\n---\n\n';
    });
    
    writeFileSync(reportPath, report);
    console.log(`\n📊 Comparison report saved: ${reportPath}`);
  }
  
  /**
   * 📊 Display result summary
   */
  private displayResultSummary(result: EnhancedEvalResult): void {
    const status = result.success ? '✅' : '❌';
    const tool = result.toolsUsed?.[0] || 'none';
    const latency = result.metrics.latency;
    
    console.log(`   ${status} Tool: ${tool} | ${latency}ms | Code: ${result.codeFileName ? '✅' : '❌'}`);
    
    if (result.brainReasoning?.needsClarification) {
      console.log(`   🤔 Needs clarification: "${result.brainReasoning.clarificationQuestion}"`);
    }
  }
  
  /**
   * 📊 Generate enhanced summary
   */
  private generateEnhancedSummary(results: EnhancedEvalResult[]): any {
    const toolChoices = new Map<string, number>();
    const clarificationRequests = new Map<string, number>();
    const editComplexities = new Map<string, number>();
    
    results.forEach(result => {
      // Count tool choices
      const tool = result.toolsUsed?.[0] || 'none';
      toolChoices.set(tool, (toolChoices.get(tool) || 0) + 1);
      
      // Count clarification requests by model pack
      if (result.brainReasoning?.needsClarification) {
        clarificationRequests.set(result.modelPack, (clarificationRequests.get(result.modelPack) || 0) + 1);
      }
      
      // Count edit complexities
      if (result.brainReasoning?.editComplexity) {
        editComplexities.set(result.brainReasoning.editComplexity, (editComplexities.get(result.brainReasoning.editComplexity) || 0) + 1);
      }
    });
    
    return {
      totalTests: results.length,
      successfulTests: results.filter(r => r.success).length,
      averageLatency: Math.round(results.reduce((sum, r) => sum + r.metrics.latency, 0) / results.length),
      totalCost: results.reduce((sum, r) => sum + (r.metrics.cost || 0), 0),
      toolChoices: Object.fromEntries(toolChoices),
      clarificationsByPack: Object.fromEntries(clarificationRequests),
      editComplexities: Object.fromEntries(editComplexities),
      outputDirectory: this.outputDir
    };
  }
}

// Export enhanced runner
export const enhancedEvaluationRunner = new EnhancedEvaluationRunner();