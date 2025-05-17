import crypto from 'crypto';

// Mock Database dependency
const mockDb = {
  operations: [],
  insert: (table) => ({
    values: (data) => {
      mockDb.operations.push({ operation: 'insert', table, data });
      return { returning: () => Promise.resolve([data]) };
    }
  }),
  update: (table) => ({
    set: (data) => ({
      where: (condition) => {
        mockDb.operations.push({ operation: 'update', table, data, condition });
        return Promise.resolve([{ ...data, id: condition?.id?.value }]);
      }
    })
  }),
  query: {
    customComponentJobs: {
      findFirst: (query) => {
        mockDb.operations.push({ operation: 'findFirst', table: 'customComponentJobs', query });
        // Mock a record found based on the condition
        if (query.where?.id) {
          return Promise.resolve({ 
            id: query.where.id, 
            componentName: 'TestComponent',
            status: 'pending'
          });
        }
        return Promise.resolve(null);
      }
    }
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
    this.db = mockDb;
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

// Test Builder Agent that actually generates component code from ADB
class TestBuilderAgent extends BaseTestAgent {
  constructor(taskManager) {
    super("BuilderAgent", taskManager);
  }
  
  // More realistic code generation based on ADB content
  generateComponentCode(adb) {
    console.log(`[BuilderAgent] Generating code for ADB: ${adb.name}`);
    
    // Extract elements and animations from ADB
    const { elements, animations } = adb;
    
    // Start building the component code
    let imports = "import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';\n";
    let componentName = adb.name.replace(/[^a-zA-Z0-9]/g, '') || 'AnimationComponent';
    
    let styleDefinitions = '';
    let elementJsx = '';
    let animationKeyframes = '';
    
    // Process elements and create corresponding JSX
    elements.forEach(element => {
      switch(element.type) {
        case 'shape':
          if (element.id === 'background') {
            // Handle background element
            const bgColor = element.properties.color || '#ffffff';
            elementJsx += `
      {/* Background */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: '${bgColor}'
      }} />`;
          } else {
            // Handle other shapes (circle, rectangle, etc)
            const color = element.properties.color || '#000000';
            const size = element.properties.size || 100;
            const shape = element.properties.shape || 'circle';
            const borderRadius = shape === 'circle' ? '50%' : '0';
            
            // Find animations for this element
            const elementAnimations = animations.filter(a => a.elementId === element.id);
            const hasAnimation = elementAnimations.length > 0;
            
            // Create variable name for position
            const posVarName = `${element.id}Position`;
            
            if (hasAnimation) {
              // Add frame calculations for animations
              elementJsx += `
      {/* ${element.name} with animation */}
      <div
        style={{
          position: 'absolute',
          width: ${size},
          height: ${size},
          backgroundColor: '${color}',
          borderRadius: '${borderRadius}',
          transform: \`translate3d(\${${posVarName}.x}px, \${${posVarName}.y}px, 0) rotate(\${${posVarName}.rotation}deg)\`,
          opacity: ${posVarName}.opacity
        }}
      />`;
            } else {
              // Static element
              elementJsx += `
      {/* ${element.name} (static) */}
      <div
        style={{
          position: 'absolute',
          width: ${size},
          height: ${size},
          backgroundColor: '${color}',
          borderRadius: '${borderRadius}',
          left: 'calc(50% - ${size/2}px)',
          top: 'calc(50% - ${size/2}px)'
        }}
      />`;
            }
          }
          break;
          
        case 'text':
          // Handle text elements
          const fontSize = element.properties.fontSize || 32;
          const textColor = element.properties.color || '#000000';
          const content = element.properties.content || 'Text';
          
          // Find animations for this element
          const textAnimations = animations.filter(a => a.elementId === element.id);
          const hasTextAnimation = textAnimations.length > 0;
          
          // Create variable name for text properties
          const textVarName = `${element.id}Props`;
          
          if (hasTextAnimation) {
            elementJsx += `
      {/* ${element.name} with animation */}
      <div
        style={{
          position: 'absolute',
          fontFamily: 'Arial, sans-serif',
          fontSize: ${fontSize},
          color: '${textColor}',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: ${textVarName}.opacity
        }}
      >
        ${content}
      </div>`;
          } else {
            elementJsx += `
      {/* ${element.name} (static) */}
      <div
        style={{
          position: 'absolute',
          fontFamily: 'Arial, sans-serif',
          fontSize: ${fontSize},
          color: '${textColor}',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        ${content}
      </div>`;
          }
          break;
          
        // Add more element types as needed
        default:
          console.log(`[BuilderAgent] Unsupported element type: ${element.type}`);
      }
    });
    
    // Process animations and create frame calculations
    let animationCalculations = '';
    
    animations.forEach(animation => {
      const element = elements.find(e => e.id === animation.elementId);
      if (!element) return;
      
      // Create variable name based on element
      const varName = `${element.id}Position`;
      const animationType = animation.type;
      
      // Start with default values 
      animationCalculations += `
  // Animation for ${element.name}
  const ${varName} = {
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 1
  };`;
      
      // Add specific animation calculation based on type
      switch(animationType) {
        case 'bounce':
          // Add bounce animation logic
          animationCalculations += `
  
  // Bounce animation
  ${varName}.y = interpolate(
    frame,
    [${animation.keyframes.map(k => k.time).join(', ')}],
    [${animation.keyframes.map(k => k.y).join(', ')}],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );`;
          break;
          
        case 'fadeIn':
          // Add fade-in animation logic
          animationCalculations += `
  
  // Fade-in animation
  ${varName}.opacity = interpolate(
    frame,
    [${animation.keyframes.map(k => k.time).join(', ')}],
    [${animation.keyframes.map(k => k.opacity).join(', ')}],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );`;
          break;
          
        case 'spin':
          // Add spin animation logic
          animationCalculations += `
  
  // Spin animation
  ${varName}.rotation = interpolate(
    frame,
    [${animation.keyframes.map(k => k.time).join(', ')}],
    [${animation.keyframes.map(k => k.rotation).join(', ')}],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );`;
          break;
          
        // Add more animation types as needed
        default:
          console.log(`[BuilderAgent] Unsupported animation type: ${animationType}`);
      }
    });
    
    // Combine everything into the final component code
    const componentCode = `${imports}
/**
 * ${adb.name}
 * 
 * Automatically generated component for animation design brief.
 * Duration: ${adb.duration} frames
 */
export default function ${componentName}() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  ${animationCalculations}
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      ${elementJsx}
    </div>
  );
}`;

    console.log(`[BuilderAgent] Generated component code (${componentCode.length} bytes)`);
    return componentCode;
  }
  
  async buildComponent(code, componentName) {
    console.log(`[BuilderAgent] Building component: ${componentName}`);
    
    // In a real implementation, this would run the build process
    // For testing, we'll simulate the build
    console.log('[BuilderAgent] Running mock build process...');
    
    // Simulate potential errors
    const syntaxErrors = this.checkForSyntaxErrors(code);
    if (syntaxErrors.length > 0) {
      return {
        success: false,
        errors: syntaxErrors,
        componentCode: code
      };
    }
    
    // Simulate successful build
    const outputUrl = `/r2/components/${componentName}-${Date.now()}.js`;
    console.log(`[BuilderAgent] Build successful: ${outputUrl}`);
    
    return {
      success: true,
      outputUrl,
      componentCode: code
    };
  }
  
  checkForSyntaxErrors(code) {
    // Simple syntax error checking
    const errors = [];
    
    // Check for unbalanced brackets, parentheses, etc.
    const braces = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for missing return statement in component
      if (line.includes('function') && !code.includes('return')) {
        errors.push({
          line: i + 1,
          message: "Component function must include a return statement"
        });
      }
      
      // Check if line contains SYNTAX_ERROR placeholder
      if (line.includes('SYNTAX_ERROR')) {
        errors.push({
          line: i + 1,
          message: "Syntax error detected",
          code: line.trim()
        });
      }
    }
    
    return errors;
  }
  
  async processMessage(message) {
    const { type, payload, id: correlationId } = message;
    const taskId = payload.taskId;
    
    try {
      console.log(`[BuilderAgent] Processing message: ${type}`);
      await this.logAgentMessage(message, true);
      
      if (type === "BUILD_COMPONENT_REQUEST") {
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Generating component code..."),
          undefined,
          "generating"
        );
        
        // Get the ADB from artifacts or payload
        const adbArtifact = message.artifacts?.find(a => a.name?.includes('adb'));
        const adb = adbArtifact?.data || payload.animationDesignBrief;
        
        if (!adb) {
          throw new Error("No Animation Design Brief provided");
        }
        
        // Generate the component code based on ADB
        const componentCode = this.generateComponentCode(adb);
        
        // Create a code artifact
        const codeArtifact = {
          id: crypto.randomUUID(),
          type: "data",
          mimeType: "application/javascript",
          data: componentCode,
          description: "Generated Component Code",
          createdAt: new Date().toISOString(),
          name: `component-code-${taskId}.js`
        };
        
        await this.addTaskArtifact(taskId, codeArtifact);
        
        // Update task state to building
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Building component..."),
          undefined,
          "building"
        );
        
        // Build the component
        const componentName = adb.name.replace(/[^a-zA-Z0-9]/g, '') || 'AnimationComponent';
        const buildResult = await this.buildComponent(componentCode, componentName);
        
        if (!buildResult.success) {
          // Handle build errors
          const errors = buildResult.errors.map(e => `Line ${e.line}: ${e.message}`);
          
          await this.updateTaskState(
            taskId,
            "working",
            this.createSimpleTextMessage(`Component build failed with ${errors.length} errors`),
            undefined,
            "failed"
          );
          
          return this.createA2AMessage(
            "COMPONENT_SYNTAX_ERROR",
            taskId,
            "CoordinatorAgent",
            this.createSimpleTextMessage(`Component has syntax errors: ${errors.join(', ')}`),
            undefined,
            correlationId,
            {
              componentCode,
              errors,
              animationDesignBrief: adb
            }
          );
        }
        
        // Handle successful build
        const builtArtifact = {
          id: crypto.randomUUID(),
          type: "file",
          mimeType: "application/javascript",
          url: buildResult.outputUrl,
          description: "Built component bundle",
          createdAt: new Date().toISOString(),
          name: `component-${taskId}.js`
        };
        
        await this.addTaskArtifact(taskId, builtArtifact);
        await this.updateTaskState(
          taskId,
          "completed",
          this.createSimpleTextMessage("Component built successfully."),
          [builtArtifact],
          "built"
        );
        
        return this.createA2AMessage(
          "COMPONENT_BUILD_SUCCESS",
          taskId,
          "CoordinatorAgent",
          this.createSimpleTextMessage("Component built successfully"),
          [builtArtifact],
          correlationId
        );
      }
      
      // Handle rebuild requests from ErrorFixerAgent
      else if (type === "REBUILD_COMPONENT_REQUEST") {
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Rebuilding component with fixed code..."),
          undefined,
          "building"
        );
        
        const fixedCode = payload.fixedCode;
        
        if (!fixedCode) {
          throw new Error("No fixed code provided");
        }
        
        // Check if the fixed code has errors
        const syntaxErrors = this.checkForSyntaxErrors(fixedCode);
        if (syntaxErrors.length > 0) {
          // Still has errors
          const errors = syntaxErrors.map(e => `Line ${e.line}: ${e.message}`);
          
          await this.updateTaskState(
            taskId,
            "working",
            this.createSimpleTextMessage(`Rebuilt component still has ${errors.length} errors`),
            undefined,
            "failed"
          );
          
          return this.createA2AMessage(
            "COMPONENT_SYNTAX_ERROR",
            taskId,
            "CoordinatorAgent",
            this.createSimpleTextMessage(`Fixed component still has syntax errors: ${errors.join(', ')}`),
            undefined,
            correlationId,
            {
              componentCode: fixedCode,
              errors,
              animationDesignBrief: payload.animationDesignBrief
            }
          );
        }
        
        // Mock successful rebuild
        const componentName = payload.animationDesignBrief?.name.replace(/[^a-zA-Z0-9]/g, '') || 'FixedComponent';
        const outputUrl = `/r2/components/${componentName}-fixed-${Date.now()}.js`;
        
        const rebuiltArtifact = {
          id: crypto.randomUUID(),
          type: "file",
          mimeType: "application/javascript",
          url: outputUrl,
          description: "Rebuilt component bundle",
          createdAt: new Date().toISOString(),
          name: `component-fixed-${taskId}.js`
        };
        
        await this.addTaskArtifact(taskId, rebuiltArtifact);
        await this.updateTaskState(
          taskId,
          "completed",
          this.createSimpleTextMessage("Component rebuilt successfully."),
          [rebuiltArtifact],
          "built"
        );
        
        return this.createA2AMessage(
          "COMPONENT_BUILD_SUCCESS",
          taskId,
          "CoordinatorAgent",
          this.createSimpleTextMessage("Component rebuilt successfully"),
          [rebuiltArtifact],
          correlationId
        );
      } else {
        console.warn(`[BuilderAgent] Unhandled message type: ${type}`);
        return null;
      }
    } catch (error) {
      console.error(`[BuilderAgent] Error processing message (${type}):`, error);
      
      if (taskId) {
        await this.updateTaskState(
          taskId,
          "failed",
          this.createSimpleTextMessage(`Builder error: ${error.message}`),
          undefined,
          "failed"
        );
      }
      
      return this.createA2AMessage(
        "COMPONENT_PROCESS_ERROR",
        taskId,
        "CoordinatorAgent",
        this.createSimpleTextMessage(`Builder error: ${error.message}`),
        undefined,
        correlationId
      );
    }
  }
}

// Test function
async function testBuilderAgent() {
  console.log("=== Testing Builder Agent ===");
  
  // Create the task manager
  const taskManager = new MockTaskManager();
  
  // Create the builder agent
  const builderAgent = new TestBuilderAgent(taskManager);
  
  // Create test task
  const taskId = crypto.randomUUID();
  console.log(`Test Task ID: ${taskId}`);
  
  // Create a mock ADB
  const mockADB = {
    id: crypto.randomUUID(),
    name: "Red Ball Bounce Animation",
    description: "A red ball bouncing on a blue background",
    duration: 90,
    dimensions: { width: 1920, height: 1080 },
    elements: [
      {
        id: "background",
        type: "shape",
        name: "Background",
        properties: { color: "#3498db" }
      },
      {
        id: "ball",
        type: "shape",
        name: "Ball",
        properties: { 
          color: "#e74c3c",
          size: 100,
          shape: "circle"
        }
      },
      {
        id: "title",
        type: "text",
        name: "Title",
        properties: {
          content: "Bouncing Ball",
          fontSize: 48,
          color: "#ffffff"
        }
      }
    ],
    animations: [
      {
        elementId: "ball",
        type: "bounce",
        keyframes: [
          { time: 0, y: 0 },
          { time: 45, y: 200 },
          { time: 90, y: 0 }
        ]
      },
      {
        elementId: "title",
        type: "fadeIn",
        keyframes: [
          { time: 0, opacity: 0 },
          { time: 30, opacity: 1 }
        ]
      }
    ]
  };
  
  // Create ADB artifact
  const adbArtifact = {
    id: crypto.randomUUID(),
    type: "data",
    mimeType: "application/json",
    data: mockADB,
    description: "Animation Design Brief",
    createdAt: new Date().toISOString(),
    name: `adb-${taskId}.json`
  };
  
  // Create a test message
  const testMessage = {
    type: "BUILD_COMPONENT_REQUEST",
    payload: {
      taskId,
      projectId: "test-project-id"
    },
    id: crypto.randomUUID(),
    from: "CoordinatorAgent",
    to: "BuilderAgent",
    artifacts: [adbArtifact]
  };
  
  console.log("\n=== Sending Test Message to Builder Agent ===");
  console.log(`Message type: ${testMessage.type}`);
  
  // Process the message
  const response = await builderAgent.processMessage(testMessage);
  
  console.log("\n=== Builder Agent Response ===");
  if (response) {
    console.log(`Response type: ${response.type}`);
    console.log(`To: ${response.to}`);
    console.log(`Message: ${response.message?.parts?.[0]?.text}`);
    
    if (response.artifacts?.length > 0) {
      console.log("\n=== Generated Artifacts ===");
      response.artifacts.forEach((artifact, i) => {
        console.log(`Artifact ${i+1}: ${artifact.name}`);
        if (artifact.url) {
          console.log(`URL: ${artifact.url}`);
        }
      });
    }
  } else {
    console.log("No response received from Builder Agent");
  }
  
  // Show task state
  console.log("\n=== Final Task State ===");
  const task = await taskManager.getTask(taskId);
  console.log(`Status: ${task?.state}`);
  console.log(`Message: ${task?.message?.parts?.[0]?.text}`);
  
  // Show artifacts
  console.log("\n=== Task Artifacts ===");
  const artifacts = await taskManager.getTaskArtifacts(taskId);
  artifacts.forEach((artifact, i) => {
    console.log(`\nArtifact ${i+1}: ${artifact.name}`);
    console.log(`Type: ${artifact.type}`);
    
    if (artifact.name.includes('component-code')) {
      // Print a preview of the code
      console.log("\nCode Preview:");
      const codeLines = artifact.data.split('\n').slice(0, 10);
      console.log(codeLines.join('\n') + '\n... [truncated]');
    }
  });
  
  // Try with a syntax error
  console.log("\n=== Testing Builder Agent with Syntax Error ===");
  
  // Modify the ADB to cause a syntax error
  const errorAdb = {...mockADB};
  errorAdb.elements.push({
    id: "error_element",
    type: "SYNTAX_ERROR",
    name: "Error Element"
  });
  
  // Create error ADB artifact
  const errorAdbArtifact = {
    ...adbArtifact,
    data: errorAdb,
    name: `error-adb-${taskId}.json`
  };
  
  // Create a test message with error
  const errorTestMessage = {
    ...testMessage,
    id: crypto.randomUUID(),
    artifacts: [errorAdbArtifact]
  };
  
  // Process the error message
  const errorResponse = await builderAgent.processMessage(errorTestMessage);
  
  console.log("\n=== Builder Agent Error Response ===");
  if (errorResponse) {
    console.log(`Response type: ${errorResponse.type}`);
    console.log(`Message: ${errorResponse.message?.parts?.[0]?.text}`);
    
    if (errorResponse.payload.errors) {
      console.log("\n=== Errors Detected ===");
      errorResponse.payload.errors.forEach((error, i) => {
        console.log(`Error ${i+1}: ${error}`);
      });
    }
  }
  
  return { 
    normalResponse: response, 
    errorResponse,
    task,
    artifacts
  };
}

// Run the test
testBuilderAgent().catch(console.error); 