//src/server/api/routers/evaluation.ts

import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { MetricsService } from "~/server/services/evaluation/metrics.service";
import { componentEvaluationMetrics, componentTestCases } from "~/server/db/schema/evaluation.schema";
import { and, gte, lt, eq, desc, count, avg, sql } from "drizzle-orm";
import { openai } from "~/server/lib/openai";
import { randomUUID } from "crypto";

// Input schemas - moved to top
const EvalConfigSchema = z.object({
  model: z.enum(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']),
  temperature: z.number().min(0).max(2),
  batchSize: z.number().min(1).max(10),
  prompt: z.string().min(1),
  testName: z.string().min(1)
});

const BatchTestInputSchema = z.object({
  config: EvalConfigSchema,
  userId: z.string()
});

/**
 * tRPC Router for the evaluation metrics
 * Provides API endpoints for querying evaluation data
 */
export const evaluationRouter = createTRPCRouter({
  /**
   * Get high-level overview metrics for the dashboard
   */
  getOverviewMetrics: publicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const metricsService = new MetricsService();
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Get metrics in date range
      const metrics = await metricsService.getMetricsInDateRange(startDate, endDate);
      
      // Calculate success rate
      const totalTests = metrics.length;
      const successfulTests = metrics.filter(m => m.success).length;
      const successRate = totalTests > 0 ? successfulTests / totalTests : 0;
      
      // Calculate average generation time
      const successfulMetrics = metrics.filter(m => m.success && m.totalTime !== null);
      const avgGenerationTime = successfulMetrics.length > 0
        ? successfulMetrics.reduce((sum, m) => sum + (m.totalTime || 0), 0) / successfulMetrics.length
        : 0;
      
      // Get most common error
      const errorCounts: Record<string, number> = {};
      metrics
        .filter((m: any) => !m.success && m.errorType)
        .forEach((m: any) => {
          const errorType = m.errorType as string;
          errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
        });
      
      let mostCommonError = 'None';
      let maxErrorCount = 0;
      
      Object.entries(errorCounts).forEach(([error, count]) => {
        if (count > maxErrorCount) {
          mostCommonError = error;
          maxErrorCount = count;
        }
      });
      
      return {
        totalTests,
        successfulTests,
        successRate,
        avgGenerationTime,
        mostCommonError,
      };
    }),

  /**
   * Get metrics broken down by category
   */
  getCategoryMetrics: publicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const metricsService = new MetricsService();
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      
      // Get metrics in date range
      const metrics = await metricsService.getMetricsInDateRange(startDate, endDate);
      
      // Group by category
      const categoryData: Record<string, {
        total: number;
        successful: number;
        totalTime: number;
        successfulCount: number;
        complexitySum: number;
      }> = {};
      
      metrics.forEach((m: any) => {
        const category = m.category;
        
        if (!categoryData[category]) {
          categoryData[category] = {
            total: 0,
            successful: 0,
            totalTime: 0,
            successfulCount: 0,
            complexitySum: 0,
          };
        }
        
        categoryData[category].total++;
        categoryData[category].complexitySum += m.complexity;
        
        if (m.success) {
          categoryData[category].successful++;
          
          if (m.totalTime !== null) {
            categoryData[category].totalTime += m.totalTime;
            categoryData[category].successfulCount++;
          }
        }
      });
      
      // Calculate success rates and avg times
      const successRateByCategory: Record<string, number> = {};
      const categoryDetails: Record<string, {
        count: number;
        avgTime: number;
        avgComplexity: number;
      }> = {};
      
      Object.entries(categoryData).forEach(([category, data]: [string, any]) => {
        successRateByCategory[category] = data.total > 0 ? data.successful / data.total : 0;
        
        categoryDetails[category] = {
          count: data.total,
          avgTime: data.successfulCount > 0 ? data.totalTime / data.successfulCount : 0,
          avgComplexity: data.total > 0 ? data.complexitySum / data.total : 0,
        };
      });
      
      return {
        successRateByCategory,
        categoryDetails,
      };
    }),

  /**
   * Get performance metrics for different pipeline stages
   */
  getPerformanceMetrics: publicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const metricsService = new MetricsService();
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      
      // Get metrics in date range
      const metrics = await metricsService.getMetricsInDateRange(startDate, endDate)
        .then(m => m.filter(item => item.success));
      
      if (metrics.length === 0) {
        return {
          avgTimeToFirstToken: 0,
          avgCodeGenTime: 0,
          avgValidationTime: 0,
          avgBuildTime: 0,
          avgUploadTime: 0,
          avgTotalTime: 0,
          p90TimeToFirstToken: 0,
          p90CodeGenTime: 0,
          p90ValidationTime: 0,
          p90BuildTime: 0,
          p90UploadTime: 0,
          p90TotalTime: 0,
        };
      }
      
      // Calculate averages for each stage
      const avgTimeToFirstToken = calculateAverage(metrics, 'timeToFirstToken');
      const avgCodeGenTime = calculateAverage(metrics, 'codeGenerationTime');
      const avgValidationTime = calculateAverage(metrics, 'validationTime');
      const avgBuildTime = calculateAverage(metrics, 'buildTime');
      const avgUploadTime = calculateAverage(metrics, 'uploadTime');
      const avgTotalTime = calculateAverage(metrics, 'totalTime');
      
      // Calculate p90 for each stage
      const p90TimeToFirstToken = calculatePercentile(metrics, 'timeToFirstToken', 0.9);
      const p90CodeGenTime = calculatePercentile(metrics, 'codeGenerationTime', 0.9);
      const p90ValidationTime = calculatePercentile(metrics, 'validationTime', 0.9);
      const p90BuildTime = calculatePercentile(metrics, 'buildTime', 0.9);
      const p90UploadTime = calculatePercentile(metrics, 'uploadTime', 0.9);
      const p90TotalTime = calculatePercentile(metrics, 'totalTime', 0.9);
      
      return {
        avgTimeToFirstToken,
        avgCodeGenTime,
        avgValidationTime,
        avgBuildTime,
        avgUploadTime,
        avgTotalTime,
        p90TimeToFirstToken,
        p90CodeGenTime,
        p90ValidationTime,
        p90BuildTime,
        p90UploadTime,
        p90TotalTime,
      };
    }),

  /**
   * Get error metrics and common failure patterns
   */
  getErrorMetrics: publicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const metricsService = new MetricsService();
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      
      // Get failed metrics in date range
      const allMetrics = await metricsService.getMetricsInDateRange(startDate, endDate);
      const failedMetrics = allMetrics.filter(m => !m.success);
      
      if (failedMetrics.length === 0) {
        return {
          totalErrors: 0,
          commonErrorTypes: [],
          errorsByStage: [],
          recentFailures: [],
        };
      }
      
      // Analyze error types
      const errorTypes: Record<string, number> = {};
      failedMetrics.forEach((m: any) => {
        const errorType = m.errorType || 'Unknown';
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      });
      
      const commonErrorTypes = Object.entries(errorTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
      
      // Analyze stages where errors occur
      const errorStages: Record<string, number> = {};
      failedMetrics.forEach((m: any) => {
        const stage = m.errorStage || 'Unknown';
        errorStages[stage] = (errorStages[stage] || 0) + 1;
      });
      
      const errorsByStage = Object.entries(errorStages)
        .map(([stage, count]) => ({ stage, count }))
        .sort((a, b) => b.count - a.count);
      
      // Get recent failures with details
      const recentFailures = failedMetrics
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
        .map((m: any) => ({
          id: m.id,
          timestamp: m.timestamp.toISOString(),
          category: m.category,
          errorStage: m.errorStage,
          errorType: m.errorType,
          errorMessage: m.errorMessage,
        }));
      
      return {
        totalErrors: failedMetrics.length,
        commonErrorTypes,
        errorsByStage,
        recentFailures,
      };
    }),

  /**
   * Get metrics in date range
   */
  getMetricsInDateRange: publicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const metricsService = new MetricsService();
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      
      // Get metrics with test case data
      const metrics = await ctx.db.select({
        id: componentEvaluationMetrics.id,
        testCaseId: componentEvaluationMetrics.testCaseId,
        taskId: componentEvaluationMetrics.taskId,
        stateTransitions: componentEvaluationMetrics.stateTransitions,
        artifacts: componentEvaluationMetrics.artifacts,
        timestamp: componentEvaluationMetrics.timestamp,
        success: componentEvaluationMetrics.success,
        category: componentEvaluationMetrics.category,
        complexity: componentEvaluationMetrics.complexity,
        totalTime: componentEvaluationMetrics.totalTime,
        testCasePrompt: componentTestCases.prompt,
      })
      .from(componentEvaluationMetrics)
      .leftJoin(componentTestCases, eq(componentEvaluationMetrics.testCaseId, componentTestCases.id))
      .where(
        and(
          gte(componentEvaluationMetrics.timestamp, startDate),
          lt(componentEvaluationMetrics.timestamp, endDate)
        )
      )
      .orderBy(desc(componentEvaluationMetrics.timestamp))
      .limit(100);
      
      return metrics;
    }),

  /**
   * Get detailed metrics for a specific test case
   */
  getTestCaseMetrics: publicProcedure
    .input(
      z.object({
        testCaseId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const metricsService = new MetricsService();
      return metricsService.getMetricsForTestCase(input.testCaseId);
    }),

  /**
   * Get success rate time series data for charting
   */
  getSuccessRateTimeSeries: publicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      
      // Get metrics in date range
      const metrics = await ctx.db.select({
        id: componentEvaluationMetrics.id,
        timestamp: componentEvaluationMetrics.timestamp,
        success: componentEvaluationMetrics.success,
      })
      .from(componentEvaluationMetrics)
      .where(
        and(
          gte(componentEvaluationMetrics.timestamp, startDate),
          lt(componentEvaluationMetrics.timestamp, endDate)
        )
      );
      
      if (metrics.length === 0) {
        return [];
      }
      
      // Group metrics by day
      const metricsByDay: Record<string, { total: number; successful: number }> = {};
      
      // Helper function to safely access and update our metrics data
      const updateMetricsForDay = (day: string, isSuccess: boolean) => {
        // Type guard: assert this is a valid key in our record
        if (!(day in metricsByDay)) {
          // Initial data structure with type safety
          metricsByDay[day] = { total: 0, successful: 0 };
        }
        
        // After initialization, we know this key exists and can be safely accessed
        // We'll use a non-null assertion since we just ensured it exists
        const data = metricsByDay[day]!;
        data.total += 1;
        
        if (isSuccess) {
          data.successful += 1;
        }
      };
      
      // Process each metric
      metrics.forEach((metric: { timestamp: Date | null; success: boolean }) => {
        if (metric && metric.timestamp) {
          try {
            // Format as YYYY-MM-DD string
            const isoString = metric.timestamp.toISOString();
            const parts = isoString.split('T');
            // Ensure we have the first part before using it
            if (parts.length > 0 && parts[0]) {
              // We now have a guaranteed non-undefined string
              const day: string = parts[0];
              // Call our helper with the validated day string
              updateMetricsForDay(day, metric.success);
            }
          } catch (error) {
            console.error('Error processing metric timestamp:', error);
            // Continue processing other metrics
          }
        }
      });
      
      // Calculate success rate for each day
      const timeSeriesData = Object.entries(metricsByDay)
        .map(([date, counts]) => ({
          date,
          rate: counts.total > 0 ? counts.successful / counts.total : 0,
          testCount: counts.total
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      return timeSeriesData;
    }),

  runBatchTest: protectedProcedure
    .input(BatchTestInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { config, userId } = input;
      const results = [];
      
      for (let i = 0; i < config.batchSize; i++) {
        const startTime = Date.now();
        
        try {
          // Enhanced system prompt following ESM patterns
          const systemPrompt = `You are an expert Remotion component generator. Generate a single React component that creates engaging motion graphics.

CRITICAL REQUIREMENTS - ESM COMPATIBILITY:
1. NEVER use import statements for React or Remotion
2. ALWAYS destructure from window.Remotion: const { AbsoluteFill, useCurrentFrame } = window.Remotion;
3. React is available globally as window.React - destructure if needed: const { useState, useEffect } = React;
4. ALWAYS export default function ComponentName() {}

ANIMATION REQUIREMENTS:
1. Use frame-based animations, NOT useEffect with timers
2. Calculate text reveal based on frame: const textIndex = Math.floor(frame / 3);
3. Use interpolate() for smooth transitions
4. Avoid infinite loops - base everything on frame number

EXAMPLE PATTERN:
const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;

export default function MyScene() {
  const frame = useCurrentFrame();
  
  // Frame-based text reveal (no useEffect!)
  const textIndex = Math.floor(frame / 3);
  const text = "Your text here".slice(0, textIndex);
  
  // Frame-based animations
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <div style={{ opacity }}>
        {text}
      </div>
    </AbsoluteFill>
  );
}

Generate a component for: ${config.prompt}

Requirements:
- Black background, white text, 80px font size
- Rounded text input box with neon purple gradient
- Text "${config.prompt}" appears letter by letter using FRAME-BASED animation
- Mouse cursor click animation and zoom effect
- NO useEffect, NO useState for animations
- Use React.createElement if you need React elements: React.createElement('div', {style: {...}}, 'content')
`;

          // Generate code using OpenAI
          const completion = await openai.chat.completions.create({
            model: config.model,
            temperature: config.temperature,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: config.prompt
              }
            ]
          });

          const generatedCode = completion.choices[0]?.message?.content || '';
          const generationTime = Date.now() - startTime;
          
          // Validate the generated code
          const compilationResult = await validateGeneratedCode(generatedCode);
          
          // Calculate quality metrics
          const qualityMetrics = calculateQualityMetrics(generatedCode, {
            success: compilationResult.isValid,
            errors: compilationResult.errors
          });
          
          results.push({
            id: randomUUID(),
            testName: config.testName,
            prompt: config.prompt,
            model: config.model,
            temperature: config.temperature,
            iteration: i + 1,
            generatedCode,
            compilationResult: {
              success: compilationResult.isValid,
              errors: compilationResult.errors,
              warnings: []
            },
            qualityMetrics,
            generationTime,
            timestamp: new Date()
          });
          
        } catch (error) {
          const generationTime = Date.now() - startTime;
          
          results.push({
            id: randomUUID(),
            testName: config.testName,
            prompt: config.prompt,
            model: config.model,
            temperature: config.temperature,
            iteration: i + 1,
            generatedCode: '',
            compilationResult: {
              success: false,
              errors: [error instanceof Error ? error.message : 'Unknown error'],
              warnings: []
            },
            qualityMetrics: {
              visualQualityScore: 0,
              animationComplexity: 0,
              tailwindUsage: 0,
              codeQuality: 0,
              hasExportDefault: false,
              hasRemotionImports: false,
              lineCount: 0,
              compilationSuccess: false
            },
            generationTime,
            timestamp: new Date()
          });
        }
      }
      
      return results;
    }),

  getTestHistory: protectedProcedure
    .query(async ({ ctx }) => {
      // This would typically fetch from database
      // For now, return empty array
      return [];
    }),

  exportResults: protectedProcedure
    .input(z.object({
      results: z.array(z.any()),
      format: z.enum(['csv', 'json'])
    }))
    .mutation(async ({ input }) => {
      const { results, format } = input;
      
      if (format === 'csv') {
        const headers = [
          'Test Name', 'Iteration', 'Model', 'Temperature', 'Prompt',
          'Compilation Success', 'Generation Time (ms)', 'Visual Quality Score',
          'Animation Complexity', 'Tailwind Usage (%)', 'Code Quality',
          'Line Count', 'Timestamp'
        ];
        
        const rows = results.map((result: any) => [
          result.testName,
          result.iteration,
          result.model,
          result.temperature,
          `"${result.prompt.replace(/"/g, '""')}"`,
          result.compilationResult.success,
          result.generationTime,
          result.qualityMetrics.visualQualityScore,
          result.qualityMetrics.animationComplexity,
          result.qualityMetrics.tailwindUsage,
          result.qualityMetrics.codeQuality,
          result.qualityMetrics.lineCount,
          result.timestamp.toISOString()
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        return { data: csv, filename: `batch-test-results-${Date.now()}.csv` };
      } else {
        return { 
          data: JSON.stringify(results, null, 2), 
          filename: `batch-test-results-${Date.now()}.json` 
        };
      }
    })
});

/**
 * Helper function to calculate average for a specific metric
 */
function calculateAverage(metrics: any[], field: string): number {
  const validValues = metrics
    .map((m: any) => m[field])
    .filter((val: any) => val !== null && val !== undefined);
  
  if (validValues.length === 0) return 0;
  
  return validValues.reduce((sum: number, val: number) => sum + val, 0) / validValues.length;
}

/**
 * Helper function to calculate percentile for a specific metric
 */
function calculatePercentile(metrics: any[], field: string, percentile: number): number {
  const validValues = metrics
    .map((m: any) => m[field])
    .filter((val: any) => val !== null && val !== undefined)
    .sort((a: number, b: number) => a - b);
  
  if (validValues.length === 0) return 0;
  
  const index = Math.ceil(validValues.length * percentile) - 1;
  return validValues[index];
}

// Import the validation function from generation router
async function validateGeneratedCode(code: string): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Basic structure validation
    if (!code || code.trim().length === 0) {
      errors.push('Generated code is empty');
      return { isValid: false, errors };
    }
    
    // Check for required export default function
    if (!/export\s+default\s+function/.test(code)) {
      errors.push('Missing export default function');
    }
    
    // Check for basic React/Remotion imports
    if (!/import.*from\s+['"]react['"]/.test(code) && !/import.*React/.test(code)) {
      errors.push('Missing React import');
    }
    
    if (!/import.*from\s+['"]remotion['"]/.test(code)) {
      errors.push('Missing Remotion imports');
    }
    
    // Check for basic syntax issues
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Mismatched braces');
    }
    
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Mismatched parentheses');
    }
    
    return { isValid: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors };
  }
}

// Calculate quality metrics
function calculateQualityMetrics(code: string, compilationResult: { success: boolean; errors: string[] }): {
  visualQualityScore: number;
  animationComplexity: number;
  tailwindUsage: number;
  codeQuality: number;
  hasExportDefault: boolean;
  hasRemotionImports: boolean;
  lineCount: number;
  compilationSuccess: boolean;
} {
  const lines = code.split('\n');
  const lineCount = lines.length;
  
  // Check for export default
  const hasExportDefault = /export\s+default\s+function/.test(code);
  
  // Check for Remotion imports
  const hasRemotionImports = /import.*from\s+['"]remotion['"]/.test(code);
  
  // Count animation functions (from BazAnimations)
  const animationFunctions = [
    'fadeInUp', 'slideInLeft', 'scaleIn', 'bounceIn', 'rotateIn',
    'fadeOutDown', 'slideOutRight', 'scaleOut', 'rotateOut',
    'pulseGlow', 'float', 'rotate', 'shake', 'heartbeat',
    'glassMorphism', 'neumorphism'
  ];
  const animationComplexity = animationFunctions.reduce((count, func) => {
    return count + (code.includes(func) ? 1 : 0);
  }, 0);
  
  // Calculate Tailwind usage (rough estimate)
  const tailwindClasses = code.match(/className="[^"]*"/g) || [];
  const totalClasses = tailwindClasses.join(' ').split(' ').length;
  const tailwindKeywords = ['bg-', 'text-', 'p-', 'm-', 'w-', 'h-', 'flex', 'grid', 'rounded', 'shadow'];
  const tailwindCount = tailwindKeywords.reduce((count, keyword) => {
    return count + (code.split(keyword).length - 1);
  }, 0);
  const tailwindUsage = totalClasses > 0 ? Math.min(100, (tailwindCount / totalClasses) * 100) : 0;
  
  // Code quality score (basic heuristics)
  let codeQuality = 10;
  if (!hasExportDefault) codeQuality -= 2;
  if (!hasRemotionImports) codeQuality -= 2;
  if (compilationResult.errors.length > 0) codeQuality -= 3;
  if (lineCount < 10) codeQuality -= 1; // Too simple
  if (lineCount > 200) codeQuality -= 1; // Too complex
  codeQuality = Math.max(0, codeQuality);
  
  // Visual quality score (based on modern patterns)
  let visualQualityScore = 5; // Base score
  if (code.includes('gradient')) visualQualityScore += 1;
  if (code.includes('shadow')) visualQualityScore += 1;
  if (code.includes('glassMorphism') || code.includes('neumorphism')) visualQualityScore += 2;
  if (animationComplexity > 0) visualQualityScore += 1;
  if (tailwindUsage > 50) visualQualityScore += 1;
  visualQualityScore = Math.min(10, visualQualityScore);
  
  return {
    visualQualityScore,
    animationComplexity,
    tailwindUsage: Math.round(tailwindUsage),
    codeQuality,
    hasExportDefault,
    hasRemotionImports,
    lineCount,
    compilationSuccess: compilationResult.success
  };
}
