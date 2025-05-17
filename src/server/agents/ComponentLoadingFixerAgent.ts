// src/server/agents/ComponentLoadingFixerAgent.ts
import { OpenAI } from 'openai';
import { env } from "~/env";
import { BaseAgent, type AgentMessage, type AgentMessagePayload } from "./base-agent";
import type { TaskManager } from '../services/a2a/taskManager.service';
import type { Artifact, TaskState, ComponentJobStatus, Message, AgentSkill, DataPart } from '../../types/a2a';
import { createTextMessage, createFileArtifact } from '../../types/a2a';
import { v4 as uuidv4 } from 'uuid';
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { a2aLogger } from "~/lib/logger";
import { r2 } from '~/server/lib/r2'; 
import { GetObjectCommand, PutObjectCommand, type PutObjectCommandOutput } from '@aws-sdk/client-s3';

// Interface for component analysis result
interface ComponentAnalysisResult {
  hasIssues: boolean;
  componentName: string | null;
  issues: string[];
  recommendedFixes: string[];
} 

const MAX_FIX_ATTEMPTS = 3;

interface ComponentLoadingFixerAgentParams {
  modelName?: string; 
  componentId?: string; 
  // Add other params as necessary
}

async function getObjectFromR2(key: string): Promise<string | null> { 
  a2aLogger.info(null, `Mock getObjectFromR2 called with ${key}`);
  return "console.log('Mock component bundle content'); const MyComponent = () => <div>Mock Component</div>"; 
}

async function putObjectInR2(key: string, content: string, contentType: string): Promise<boolean> { 
  a2aLogger.info(null, `Mock putObjectInR2 called with ${key}`);
  return true; 
}

export class ComponentLoadingFixerAgent extends BaseAgent {
  private agentParams: ComponentLoadingFixerAgentParams;
  private fixAttempts: Map<string, number> = new Map();

  constructor(taskManager: TaskManager, agentParams: ComponentLoadingFixerAgentParams) {
    super(
      "ComponentLoadingFixerAgent",
      taskManager,
      "An agent that analyzes component code, identifies loading issues, and attempts to fix them.",
      true 
    );
    this.agentParams = agentParams;
    this.modelName = env.DEFAULT_ADB_MODEL || "gpt-4o-mini"; 
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const { type, payload, correlationId, sender: messageSender } = message;
    const taskId = payload.taskId as string;
    const originalMessageContent = payload.message as Message | undefined;
    const originalArtifacts = payload.artifacts as Artifact[] | undefined;

    a2aLogger.agentProcess(this.getName(), taskId, "processMessage", `Received message type: ${type}`, { payload });

    if (!taskId) {
      a2aLogger.error(this.getName(), "ComponentLoadingFixer Error: Missing taskId in message payload", {payload});
      return null; 
    }

    try {
      switch (type) {
        case "FIX_COMPONENT_REQUEST":
          return await this.handleFixComponentRequest(message, taskId, correlationId);
        case "ANALYZE_COMPONENT_REQUEST":
          return await this.handleAnalyzeComponentRequest(message, taskId, correlationId);
        case "VERIFY_COMPONENT_REQUEST":
          await this.updateTaskState(taskId, 'completed', createTextMessage('Component verification is not yet fully implemented.'), undefined, 'complete');
          return super.createA2AMessage("COMPONENT_VERIFICATION_COMPLETED", taskId, messageSender, createTextMessage('Verification not implemented'), undefined, correlationId);
        default:
          a2aLogger.info(taskId, `ComponentLoadingFixer received unhandled message type: ${type}`);
          await this.updateTaskState(taskId, 'failed', createTextMessage(`Unhandled message type: ${type}`), undefined, 'failed');
          return super.createA2AMessage("AGENT_ERROR", taskId, messageSender, createTextMessage(`Unhandled message type by ${this.getName()}: ${type}`), undefined, correlationId);
      }
    } catch (error: any) {
      a2aLogger.error(taskId, `Error processing message in ${this.getName()}: ${error.message}`, { error, payload });
      await this.updateTaskState(
        taskId,
        "failed",
        createTextMessage(`Error: ${this.getName()} internal error: ${error.message}`),
        undefined,
        "failed"
      );
      return super.createA2AMessage(
        "AGENT_ERROR",
        taskId,
        messageSender,
        createTextMessage(`Error in ${this.getName()}: ${error.message}`),
        undefined,
        correlationId
      );
    }
  }

  private async handleFixComponentRequest(message: AgentMessage, taskId: string, correlationId?: string): Promise<AgentMessage | null> {
    const { payload, sender: messageSender } = message;
    const componentId = payload.componentId as string || this.agentParams.componentId;
    const originalMessageContent = payload.message as Message | undefined;

    const dataPartContent = originalMessageContent?.parts?.find(p => p.type === 'data') as DataPart | undefined;
    const customData = dataPartContent?.data;

    if (!componentId) {
      const errorMsg = "Missing componentId in FIX_COMPONENT_REQUEST";
      await this.updateTaskState(taskId, "failed", createTextMessage(errorMsg), undefined, "failed");
      return super.createA2AMessage("COMPONENT_FIX_ERROR", taskId, messageSender, createTextMessage(errorMsg), undefined, correlationId);
    }

    a2aLogger.info(taskId, `${this.getName()} starting fix for component ${componentId}`);
    await this.updateTaskState(taskId, "working", createTextMessage(`Fixing component ${componentId}...`), undefined, "fixing");

    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId),
    });

    if (!component) {
      const errorMsg = `Component with ID ${componentId} not found`;
      await this.updateTaskState(taskId, "failed", createTextMessage(errorMsg), undefined, "failed");
      return super.createA2AMessage("COMPONENT_FIX_ERROR", taskId, messageSender, createTextMessage(errorMsg), undefined, correlationId);
    }

    if (!component.outputUrl) {
      const errorMsg = `Component ${componentId} has no outputUrl`;
      await this.updateTaskState(taskId, "failed", createTextMessage(errorMsg), undefined, "failed");
      return super.createA2AMessage("COMPONENT_FIX_ERROR", taskId, messageSender, createTextMessage(errorMsg), undefined, correlationId);
    }

    const r2Key = component.outputUrl.split("/").pop();
    if (!r2Key) {
      const errorMsg = `Invalid R2 key for component ${componentId}`;
      await this.updateTaskState(taskId, "failed", createTextMessage(errorMsg), undefined, "failed");
      return super.createA2AMessage("COMPONENT_FIX_ERROR", taskId, messageSender, createTextMessage(errorMsg), undefined, correlationId);
    }

    const bundleContent = await getObjectFromR2(r2Key);
    if (!bundleContent) {
      const errorMsg = `Failed to download bundle for component ${componentId}`;
      await this.updateTaskState(taskId, "failed", createTextMessage(errorMsg), undefined, "r2_failed");
      return super.createA2AMessage("COMPONENT_FIX_ERROR", taskId, messageSender, createTextMessage(errorMsg), undefined, correlationId);
    }

    const { fixed, changes, fixedBundleContent } = await this.fixRemotionComponentAssignment(
      bundleContent,
      component.effect || "UnknownComponent" 
    );

    if (fixed && fixedBundleContent) {
      await putObjectInR2(r2Key, fixedBundleContent, 'application/javascript');
      const resultMessage = `Component ${componentId} fixed successfully. Changes: ${changes.join(", ")}`;
      const artifact = createFileArtifact(r2Key, fixedBundleContent, 'application/javascript', 'fixed-bundle');
      await this.addTaskArtifact(taskId, artifact);
      await this.updateTaskState(taskId, "completed", createTextMessage(resultMessage), [artifact], "built");
      return super.createA2AMessage("COMPONENT_FIX_COMPLETED", taskId, messageSender, createTextMessage(resultMessage), [artifact], correlationId);
    } else {
      const resultMessage = `No changes needed or fix failed for component ${componentId}. Issues: ${changes.join(', ')}`;
      await this.updateTaskState(taskId, "completed", createTextMessage(resultMessage), undefined, "complete"); 
      return super.createA2AMessage("COMPONENT_FIX_NO_OP", taskId, messageSender, createTextMessage(resultMessage), undefined, correlationId);
    }
  }

  private async handleAnalyzeComponentRequest(message: AgentMessage, taskId: string, correlationId?: string): Promise<AgentMessage | null> {
    const { payload, sender: messageSender } = message;
    const componentUrl = payload.componentUrl as string;

    if (!componentUrl) {
      a2aLogger.error(taskId, `${this.getName()}: Missing componentUrl in ANALYZE_COMPONENT_REQUEST`, { payload });
      await this.updateTaskState(taskId, 'failed', createTextMessage('Missing componentUrl in request'), undefined, 'failed');
      return super.createA2AMessage("AGENT_ERROR", taskId, messageSender, createTextMessage("Missing componentUrl in request"), undefined, correlationId);
    }

    a2aLogger.info(taskId, `${this.getName()} analyzing component at URL: ${componentUrl}`);
    await this.updateTaskState(taskId, 'working', createTextMessage('Analyzing component for issues...'), undefined, 'generating' as ComponentJobStatus);

    const r2Key = this.extractR2KeyFromUrl(componentUrl);

    if (!r2Key) {
      const errorMsg = `${this.getName()}: Invalid R2 URL: ${componentUrl}`;
      a2aLogger.error(taskId, errorMsg, { payload });
      await this.updateTaskState(taskId, 'failed', createTextMessage(`Invalid component URL: ${componentUrl}`), undefined, 'failed' as ComponentJobStatus);
      return super.createA2AMessage("AGENT_ERROR", taskId, messageSender, createTextMessage(`Invalid component URL: ${componentUrl}`), undefined, correlationId);
    }

    const bundleContent = await getObjectFromR2(r2Key);
    if (!bundleContent) {
      const errorMsg = `Failed to download bundle for component from ${r2Key}`;
      await this.updateTaskState(taskId, "failed", createTextMessage(errorMsg), undefined, "failed" as ComponentJobStatus);
      return super.createA2AMessage("COMPONENT_ANALYSIS_ERROR", taskId, messageSender, createTextMessage(errorMsg), undefined, correlationId);
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!bundleContent.includes("window.__REMOTION_COMPONENT")) {
      issues.push("Missing window.__REMOTION_COMPONENT assignment");
      recommendations.push("Add window.__REMOTION_COMPONENT assignment for proper loading in Remotion player");
    }
    const hasDefaultExport = /export\s+default\s+(\w+)/.test(bundleContent);
    const hasNamedExport = /export\s+const\s+(\w+)\s*=/.test(bundleContent);
    if (!hasDefaultExport && !hasNamedExport) {
      issues.push("No export statements found");
      recommendations.push("Add export default for the main component");
    }
    const hasReactImport = bundleContent.includes("import React") || bundleContent.includes("window.React");
    if (!hasReactImport) {
      issues.push("No React import or window.React reference found");
      recommendations.push("Add window.React reference if React is used globally, or import React.");
    }

    // Extract component name from the bundle content or use a default name
    const extractedComponentName = this.extractComponentName(bundleContent) || 'UnknownComponent';
    
    const status = issues.length === 0 ? "VALID" : "NEEDS_FIX";
    const analysisResultPayload = { 
      componentName: extractedComponentName, 
      status, 
      issues, 
      recommendations, 
      r2Key 
    };

    await this.updateTaskState(taskId, "completed", createTextMessage(`Component analysis completed: ${status}`), undefined, "complete" as ComponentJobStatus);
    return super.createA2AMessage("COMPONENT_ANALYSIS_COMPLETED", taskId, messageSender, createTextMessage(JSON.stringify(analysisResultPayload)), undefined, correlationId);
  }

  private async fixRemotionComponentAssignment(
    bundleContent: string,
    componentName: string
  ): Promise<{ fixed: boolean; changes: string[]; fixedBundleContent?: string }> {
    const result: { fixed: boolean; changes: string[]; fixedBundleContent?: string } = {
      fixed: false,
      changes: [] as string[],
      fixedBundleContent: bundleContent
    };
    
    const hasRemotionComponentAssignment = bundleContent.includes('window.__REMOTION_COMPONENT');
    let extractedName = this.extractComponentName(bundleContent) || componentName;

    if (hasRemotionComponentAssignment) {
      result.changes.push('Component already has window.__REMOTION_COMPONENT assignment');
      if (!bundleContent.includes(`window.__REMOTION_COMPONENT = ${extractedName};`)) {
      }
      // return result; 
    }
    
    if (!extractedName) {
      result.changes.push('Could not determine component name for assignment');
      return { ...result, fixed: false }; 
    }
    
    const hasDefaultExport = /export\s+default\s+(\w+)/.test(result.fixedBundleContent || '');
    const hasNamedExport = new RegExp(`export\s+const\s+(${extractedName})\s*=`).test(result.fixedBundleContent || '');
    
    let madeChanges = false;
    
    if (!hasRemotionComponentAssignment) {
      result.fixedBundleContent += `\n\n// Added by ComponentLoadingFixerAgent\nwindow.__REMOTION_COMPONENT = ${extractedName};\n`;
      result.changes.push(`Added window.__REMOTION_COMPONENT = ${extractedName} assignment`);
      madeChanges = true;
    }
    
    if (!hasDefaultExport && !hasNamedExport) {
      result.fixedBundleContent += `\n// Added export by ComponentLoadingFixerAgent\nexport default ${extractedName};\n`;
      result.changes.push(`Added export default ${extractedName}`);
      madeChanges = true;
    }
        
    result.fixed = madeChanges;
    if (!madeChanges) {
      result.fixedBundleContent = undefined; 
    }
    return result;
  }
  
  private extractComponentName(bundleContent: string): string | null {
    const patterns = [
      /const\s+(\w+)\s*=\s*\(\s*(?:props|{.*})\s*\)\s*=>/,     
      /function\s+(\w+)\s*\(\s*(?:props|{.*})\s*\)\s*{/,        
      /class\s+(\w+)\s+extends\s+React\.Component/,             
      /window\.(\w+)\s*=\s*(?:function|class|\()/,              
      /const\s+(\w+)\s*=\s*React\..*?Component/                 
    ];
    
    for (const pattern of patterns) {
      const match = bundleContent.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  private extractR2KeyFromUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname.endsWith('.r2.dev')) {
        return parsedUrl.pathname.startsWith('/') ? parsedUrl.pathname.substring(1) : parsedUrl.pathname;
      }
      return null;
    } catch (e) {
      a2aLogger.error(this.getName(), `Error parsing R2 URL: ${url}`, e);
      return null;
    }
  }

  private async downloadFromR2(key: string): Promise<string | null> {
    try {
      a2aLogger.info(this.getName(), `Downloading from R2: ${key}`);
      const object = await r2.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
      if (!object.Body) return null;
      return await object.Body.transformToString();
    } catch (error) {
      a2aLogger.error(this.getName(), `Failed to download ${key} from R2`, error);
      return null;
    }
  }

  private async uploadToR2(key: string, body: string): Promise<PutObjectCommandOutput | null> {
    try {
      a2aLogger.info(this.getName(), `Uploading to R2: ${key}`);
      return await r2.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: body, ContentType: 'application/javascript' }));
    } catch (error) {
      a2aLogger.error(this.getName(), `Failed to upload ${key} to R2`, error);
      return null;
    }
  }
}
