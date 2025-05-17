import crypto from 'crypto';

// Mock the necessary imports for ErrorFixerAgent
const mockDb = {
  insert: () => ({ values: () => Promise.resolve({ id: 'mock-id' }) }),
  update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  select: () => ({ from: () => ({ where: () => Promise.resolve([{ id: 'mock-id' }]) }) }),
};

// Mock component repair function
const mockRepairComponentSyntax = async (code) => {
  console.log(`Repairing component code: ${code.substring(0, 50)}...`);
  
  // Check if code has common errors we can fix
  if (code.includes('const a = 1; const a = 2;')) {
    // Fix duplicate variable declaration
    return {
      code: code.replace('const a = 1; const a = 2;', 'const a = 1; const b = 2;'),
      fixes: ["Fixed duplicate variable declaration"],
      fixedSyntaxErrors: true
    };
  } else if (code.includes('export default function () {')) {
    // Fix unnamed function
    return {
      code: code.replace('export default function () {', 'export default function Component() {'),
      fixes: ["Added name to anonymous function"],
      fixedSyntaxErrors: true
    };
  } else if (code.includes('SYNTAX_ERROR')) {
    // Simulate unfixable error
    return {
      code: code,
      fixes: ["Attempted to fix syntax error but failed"],
      fixedSyntaxErrors: false
    };
  } else {
    // No errors found or mock a successful fix
    return {
      code: code + '\n// Fixed by ErrorFixerAgent',
      fixes: ["Applied standard syntax fixes"],
      fixedSyntaxErrors: true
    };
  }
};

// Mock TaskManager for tracking state
class MockTaskManager {
  constructor() {
    this.tasks = new Map();
    this.artifacts = new Map();
    this.messages = [];
  }

  async createTask(taskData) {
    const taskId = taskData.id || crypto.randomUUID();
    this.tasks.set(taskId, { 
      id: taskId, 
      state: 'submitted',
      message: taskData.message,
      createdAt: new Date().toISOString() 
    });
    console.log(`[TaskManager] Created task ${taskId}`);
    return { id: taskId };
  }

  async updateTaskStatus(taskId, state, message, artifacts = [], componentStatus) {
    const task = this.tasks.get(taskId) || { id: taskId };
    task.state = state;
    task.message = message;
    task.updatedAt = new Date().toISOString();
    if (componentStatus) task.componentStatus = componentStatus;
    this.tasks.set(taskId, task);
    
    console.log(`[TaskManager] Task ${taskId} updated to state: ${state}`);
    return task;
  }

  async addTaskArtifact(taskId, artifact) {
    if (!this.artifacts.has(taskId)) {
      this.artifacts.set(taskId, []);
    }
    this.artifacts.get(taskId).push(artifact);
    console.log(`[TaskManager] Added artifact to task ${taskId}: ${artifact.name}`);
    return artifact;
  }

  async logTaskMessage(taskId, message) {
    message.taskId = taskId;
    message.timestamp = new Date().toISOString();
    this.messages.push(message);
    return message;
  }
  
  async getTask(taskId) {
    return this.tasks.get(taskId);
  }
  
  async getTaskArtifacts(taskId) {
    return this.artifacts.get(taskId) || [];
  }
}

// Simple base agent for testing
class BaseTestAgent {
  constructor(name, taskManager) {
    this.name = name;
    this.taskManager = taskManager;
  }
  
  createSimpleTextMessage(text) {
    return {
      role: "agent",
      parts: [{ type: "text", text }]
    };
  }
  
  async updateTaskState(taskId, state, message, artifacts, componentStatus) {
    return this.taskManager.updateTaskStatus(taskId, state, message, artifacts, componentStatus);
  }

  async addTaskArtifact(taskId, artifact) {
    return this.taskManager.addTaskArtifact(taskId, artifact);
  }

  async logAgentMessage(message, isIncoming = false) {
    const direction = isIncoming ? "received" : "sent";
    if (message.payload?.taskId) {
      return this.taskManager.logTaskMessage(message.payload.taskId, {
        type: message.type,
        from: isIncoming ? message.from : this.name,
        to: isIncoming ? this.name : message.to,
        content: JSON.stringify(message.payload),
        direction
      });
    }
    return Promise.resolve();
  }

  createA2AMessage(type, taskId, toAgent, message, artifacts, correlationId, additionalPayload = {}) {
    return {
      type,
      payload: { 
        taskId,
        ...additionalPayload
      },
      id: correlationId || crypto.randomUUID(),
      from: this.name,
      to: toAgent,
      message,
      artifacts
    };
  }
}

// Test Error Fixer Agent that implements more advanced code fixing
class TestErrorFixerAgent extends BaseTestAgent {
  constructor(taskManager) {
    super("ErrorFixerAgent", taskManager);
  }
  
  // More realistic code analysis and fixing based on error messages
  async fixComponentCode(componentCode, errors, animationDesignBrief) {
    console.log(`[ErrorFixerAgent] Analyzing code with ${errors.length} errors`);
    
    let fixedCode = componentCode;
    const fixDetails = [];
    let fixesApplied = 0;
    
    // Parse errors and apply fixes
    for (const error of errors) {
      console.log(`[ErrorFixerAgent] Analyzing error: ${error}`);
      
      // Extract line number if available
      const lineMatch = error.match(/Line (\d+):/);
      const lineNumber = lineMatch ? parseInt(lineMatch[1]) : null;
      
      // Identify error type and apply appropriate fix
      if (error.includes('Syntax error')) {
        // Fix for generic syntax errors
        if (fixedCode.includes('SYNTAX_ERROR')) {
          const originalLine = fixedCode.split('\n').find(line => line.includes('SYNTAX_ERROR'));
          const fixedLine = originalLine.replace('SYNTAX_ERROR', '');
          
          fixedCode = fixedCode.replace(originalLine, fixedLine);
          fixDetails.push({
            type: 'Syntax error',
            original: originalLine,
            fixed: fixedLine,
            explanation: 'Removed invalid syntax token'
          });
          fixesApplied++;
        }
      }
      else if (error.includes('must include a return statement')) {
        // Fix missing return statement
        const componentFunctionMatch = fixedCode.match(/function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*{/);
        if (componentFunctionMatch) {
          const functionName = componentFunctionMatch[1];
          const basicReturn = `\n  return (\n    <div>Default ${functionName} component</div>\n  );`;
          
          // Insert return statement before the last function closing brace
          const lastBraceIndex = fixedCode.lastIndexOf('}');
          if (lastBraceIndex > -1) {
            fixedCode = fixedCode.substring(0, lastBraceIndex) + basicReturn + fixedCode.substring(lastBraceIndex);
            fixDetails.push({
              type: 'Missing return',
              fixed: basicReturn,
              explanation: 'Added missing return statement to component'
            });
            fixesApplied++;
          }
        }
      }
      else if (error.toLowerCase().includes('unexpected token')) {
        // Fix missing or extra tokens
        if (lineNumber) {
          const lines = fixedCode.split('\n');
          if (lineNumber <= lines.length) {
            const errorLine = lines[lineNumber - 1];
            
            // Common cases to fix
            let fixedLine = errorLine;
            
            // Missing parenthesis
            if (error.includes("'return'")) {
              fixedLine = errorLine.replace('return', 'return (');
              // Also add a closing parenthesis before the next semicolon
              const semicolonIndex = fixedCode.indexOf(';', fixedCode.indexOf(errorLine));
              if (semicolonIndex > -1) {
                fixedCode = fixedCode.substring(0, semicolonIndex) + ')' + fixedCode.substring(semicolonIndex);
              }
            }
            
            // Fix the specific line
            lines[lineNumber - 1] = fixedLine;
            fixedCode = lines.join('\n');
            
            fixDetails.push({
              type: 'Unexpected token',
              line: lineNumber,
              original: errorLine,
              fixed: fixedLine,
              explanation: 'Fixed syntax in problematic line'
            });
            fixesApplied++;
          }
        }
      }
      else if (error.includes('UNFIXABLE')) {
        // This is a marker for errors we can't fix
        return {
          fixed: false,
          fixedCode: null,
          reason: 'Component contains unfixable errors',
          fixDetails: []
        };
      }
    }
    
    if (fixesApplied === 0 && errors.length > 0) {
      // We couldn't identify specific fixes for the errors
      console.log('[ErrorFixerAgent] Could not identify specific fixes for reported errors');
      
      // If code contains SYNTAX_ERROR as a fallback
      if (fixedCode.includes('SYNTAX_ERROR')) {
        fixedCode = fixedCode.replace(/SYNTAX_ERROR\s*/g, '');
        fixDetails.push({
          type: 'Generic syntax error',
          explanation: 'Removed invalid syntax markers'
        });
        fixesApplied++;
      }
    }
    
    // Check if we need to improve the component based on ADB
    if (animationDesignBrief && fixesApplied === 0) {
      // This would be where we could enhance the component based on ADB details
      console.log('[ErrorFixerAgent] No errors to fix, but enhancing component based on ADB');
      
      // Example enhancement: ensure proper animation for elements
      const { elements, animations } = animationDesignBrief;
      if (animations && animations.length > 0) {
        // Check if interpolate is imported
        if (!fixedCode.includes('import') || !fixedCode.includes('interpolate')) {
          const importLine = "import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';\n";
          fixedCode = importLine + fixedCode.replace(/import[^;]*remotion[^;]*;/, '');
          fixDetails.push({
            type: 'Enhancement',
            explanation: 'Added proper Remotion imports for animations'
          });
        }
      }
    }
    
    return {
      fixed: fixesApplied > 0,
      fixedCode,
      fixDetails,
      fixesApplied
    };
  }
  
  async processMessage(message) {
    const { type, payload, id: correlationId } = message;
    const taskId = payload.taskId;
    
    try {
      console.log(`[ErrorFixerAgent] Processing message: ${type}`);
      await this.logAgentMessage(message, true);
      
      if (type === "COMPONENT_SYNTAX_ERROR" || type === "COMPONENT_BUILD_ERROR") {
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Analyzing component errors..."),
          undefined,
          "fixing"
        );
        
        // Fix: Access componentCode from either payload directly or from payload.metadata
        const componentCode = payload.componentCode || payload.metadata?.componentCode;
        const errors = payload.errors || payload.metadata?.errors || [];
        const animationDesignBrief = payload.animationDesignBrief || payload.metadata?.animationDesignBrief;
        
        console.log(`[ErrorFixerAgent] Component code available: ${!!componentCode}`);
        console.log(`[ErrorFixerAgent] Errors available: ${errors.length > 0}`);
        
        if (!componentCode) {
          console.log("[ErrorFixerAgent] No component code provided, cannot proceed with fix");
          
          await this.updateTaskState(
            taskId,
            "failed",
            this.createSimpleTextMessage("Cannot fix component: no code provided"),
            undefined,
            "fix_failed"
          );
          
          return this.createA2AMessage(
            "COMPONENT_FIX_ERROR",
            taskId,
            "CoordinatorAgent",
            this.createSimpleTextMessage("Failed to fix component: no code was provided"),
            undefined,
            correlationId
          );
        }
        
        console.log(`[ErrorFixerAgent] Fixing errors: ${errors.join(", ")}`);
        
        // Apply the more sophisticated fixing logic
        const fixResult = await this.fixComponentCode(componentCode, errors, animationDesignBrief);
        
        if (fixResult.fixed) {
          // Create artifact with fixed code
          const fixedCodeArtifact = {
            id: crypto.randomUUID(),
            type: "data",
            mimeType: "application/javascript",
            data: fixResult.fixedCode,
            description: "Fixed Component Code",
            createdAt: new Date().toISOString(),
            name: `component-fixed-${taskId}.js`
          };
          
          await this.addTaskArtifact(taskId, fixedCodeArtifact);
          
          // Create report artifact with fix details
          const fixReportArtifact = {
            id: crypto.randomUUID(),
            type: "data",
            mimeType: "application/json",
            data: {
              originalErrors: errors,
              fixesApplied: fixResult.fixesApplied,
              fixDetails: fixResult.fixDetails,
              timestamp: new Date().toISOString()
            },
            description: "Error Fix Report",
            createdAt: new Date().toISOString(),
            name: `fix-report-${taskId}.json`
          };
          
          await this.addTaskArtifact(taskId, fixReportArtifact);
          
          await this.updateTaskState(
            taskId,
            "working",
            this.createSimpleTextMessage(`Component errors fixed successfully (${fixResult.fixesApplied} fixes applied)`),
            [fixedCodeArtifact, fixReportArtifact],
            "generating"
          );
          
          return this.createA2AMessage(
            "REBUILD_COMPONENT_REQUEST",
            taskId,
            "BuilderAgent",
            this.createSimpleTextMessage("Component code fixed. Requesting rebuild."),
            [fixedCodeArtifact],
            correlationId,
            {
              fixedCode: fixResult.fixedCode,
              originalErrors: errors,
              fixReport: fixReportArtifact.data,
              animationDesignBrief
            }
          );
        } else {
          await this.updateTaskState(
            taskId,
            "failed",
            this.createSimpleTextMessage("Could not fix component errors: " + (fixResult.reason || "Unknown error")),
            undefined,
            "fix_failed"
          );
          
          return this.createA2AMessage(
            "COMPONENT_FIX_ERROR",
            taskId,
            "CoordinatorAgent",
            this.createSimpleTextMessage("Failed to fix component errors: " + (fixResult.reason || "Errors are unfixable")),
            undefined,
            correlationId
          );
        }
      } else {
        console.warn(`[ErrorFixerAgent] Unhandled message type: ${type}`);
        return null;
      }
    } catch (error) {
      console.error(`[ErrorFixerAgent] Error processing message (${type}):`, error);
      
      if (taskId) {
        await this.updateTaskState(
          taskId,
          "failed",
          this.createSimpleTextMessage(`Error fixer error: ${error.message}`),
          undefined,
          "failed"
        );
      }
      
      return this.createA2AMessage(
        "COMPONENT_PROCESS_ERROR",
        taskId,
        "CoordinatorAgent",
        this.createSimpleTextMessage(`Error fixer error: ${error.message}`),
        undefined,
        correlationId
      );
    }
  }
}

// Test function for fixing syntax errors
async function testErrorFixerAgent() {
  console.log("=== Testing Error Fixer Agent ===");
  
  // Create task manager and agent
  const taskManager = new MockTaskManager();
  const errorFixerAgent = new TestErrorFixerAgent(taskManager);
  
  // Create test task
  const taskId = crypto.randomUUID();
  console.log(`Test Task ID: ${taskId}`);
  
  // Test 1: Code with syntax error
  const codeWithSyntaxError = `
import { useCurrentFrame, useVideoConfig } from 'remotion';

export default function TestComponent() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  SYNTAX_ERROR return (
    <div style={{ background: 'blue', width: '100%', height: '100%' }}>
      <div style={{ 
        position: 'absolute', 
        borderRadius: '50%', 
        width: 100, 
        height: 100, 
        background: 'red',
      }} />
    </div>
  );
}`;

  // Create test message with syntax error
  const syntaxErrorMessage = {
    type: "COMPONENT_SYNTAX_ERROR",
    payload: {
      taskId,
      componentCode: codeWithSyntaxError,
      errors: ["Line 7: Syntax error detected: Unexpected token 'return'"]
    },
    id: crypto.randomUUID(),
    from: "CoordinatorAgent",
    to: "ErrorFixerAgent"
  };
  
  console.log("\n=== Test 1: Fixing Syntax Error ===");
  const syntaxErrorResponse = await errorFixerAgent.processMessage(syntaxErrorMessage);
  
  console.log("\n=== Syntax Error Fix Response ===");
  if (syntaxErrorResponse) {
    console.log(`Response type: ${syntaxErrorResponse.type}`);
    console.log(`To: ${syntaxErrorResponse.to}`);
    console.log(`Message: ${syntaxErrorResponse.message?.parts?.[0]?.text}`);
    
    // Display the fixed code
    if (syntaxErrorResponse.payload.fixedCode) {
      console.log("\n=== Fixed Code Preview ===");
      console.log(syntaxErrorResponse.payload.fixedCode.substring(0, 200) + "...");
      
      // Display fix report
      if (syntaxErrorResponse.payload.fixReport) {
        console.log("\n=== Fix Report ===");
        console.log(`Fixes applied: ${syntaxErrorResponse.payload.fixReport.fixesApplied}`);
        syntaxErrorResponse.payload.fixReport.fixDetails.forEach((fix, i) => {
          console.log(`\nFix ${i+1}: ${fix.type}`);
          console.log(`Explanation: ${fix.explanation}`);
          if (fix.original) console.log(`Original: ${fix.original}`);
          if (fix.fixed) console.log(`Fixed: ${fix.fixed}`);
        });
      }
    }
  }
  
  // Test 2: Code with missing return statement
  const codeWithMissingReturn = `
import { useCurrentFrame, useVideoConfig } from 'remotion';

export default function TestComponent() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  // Oops, missing return statement
}`;

  // Create test message with missing return
  const missingReturnMessage = {
    type: "COMPONENT_BUILD_ERROR",
    payload: {
      taskId,
      componentCode: codeWithMissingReturn,
      errors: ["Line 4: Component function must include a return statement"]
    },
    id: crypto.randomUUID(),
    from: "CoordinatorAgent",
    to: "ErrorFixerAgent"
  };
  
  console.log("\n=== Test 2: Fixing Missing Return Statement ===");
  const missingReturnResponse = await errorFixerAgent.processMessage(missingReturnMessage);
  
  console.log("\n=== Missing Return Fix Response ===");
  if (missingReturnResponse) {
    console.log(`Response type: ${missingReturnResponse.type}`);
    console.log(`Message: ${missingReturnResponse.message?.parts?.[0]?.text}`);
    
    // Display the fixed code
    if (missingReturnResponse.payload.fixedCode) {
      console.log("\n=== Fixed Code Preview ===");
      console.log(missingReturnResponse.payload.fixedCode);
    }
  }
  
  // Test 3: Code with unfixable error
  const unfixableCode = `
import { useCurrentFrame } from 'remotion';

export default function BrokenComponent() {
  UNFIXABLE_ERROR
  const frame = useCurrentFrame();
  
  return (
    <CompletelyInvalidComponent that="cannot be fixed" />
  );
}`;

  // Create test message with unfixable error
  const unfixableMessage = {
    type: "COMPONENT_SYNTAX_ERROR",
    payload: {
      taskId,
      componentCode: unfixableCode,
      errors: ["UNFIXABLE: Component uses invalid JSX structure that cannot be automatically repaired"]
    },
    id: crypto.randomUUID(),
    from: "CoordinatorAgent",
    to: "ErrorFixerAgent"
  };
  
  console.log("\n=== Test 3: Handling Unfixable Error ===");
  const unfixableResponse = await errorFixerAgent.processMessage(unfixableMessage);
  
  console.log("\n=== Unfixable Error Response ===");
  if (unfixableResponse) {
    console.log(`Response type: ${unfixableResponse.type}`);
    console.log(`Message: ${unfixableResponse.message?.parts?.[0]?.text}`);
  }
  
  // Show final task state and artifacts
  console.log("\n=== Final Task State ===");
  const task = await taskManager.getTask(taskId);
  console.log(`Status: ${task?.state}`);
  console.log(`Message: ${task?.message?.parts?.[0]?.text}`);
  
  console.log("\n=== Task Artifacts ===");
  const artifacts = await taskManager.getTaskArtifacts(taskId);
  console.log(`Total artifacts: ${artifacts.length}`);
  artifacts.forEach((artifact, i) => {
    console.log(`\nArtifact ${i+1}: ${artifact.name}`);
    console.log(`Type: ${artifact.type}, MIME: ${artifact.mimeType}`);
  });
  
  return {
    syntaxErrorResponse,
    missingReturnResponse,
    unfixableResponse,
    task,
    artifacts
  };
}

// Run the test
testErrorFixerAgent().catch(console.error); 