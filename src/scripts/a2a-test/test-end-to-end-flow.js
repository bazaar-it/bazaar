import crypto from 'crypto';

// Mock MessageBus for routing messages between agents
class MockMessageBus {
  constructor() {
    this.agents = new Map();
    this.messages = [];
  }

  registerAgent(name, agent) {
    this.agents.set(name, agent);
    console.log(`[MessageBus] Registered agent: ${name}`);
  }

  async sendMessage(message) {
    this.messages.push({
      ...message,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[MessageBus] Routing message: ${message.type} from ${message.from} to ${message.to}`);
    
    const targetAgent = this.agents.get(message.to);
    if (!targetAgent) {
      console.error(`[MessageBus] Unknown agent: ${message.to}`);
      return null;
    }
    
    return targetAgent.processMessage(message);
  }
  
  getMessageHistory() {
    return this.messages;
  }
}

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

// Base agent class
class BaseAgent {
  constructor(name, taskManager, messageBus) {
    this.name = name;
    this.taskManager = taskManager;
    this.messageBus = messageBus;
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
  
  async sendMessage(message) {
    await this.logAgentMessage(message, false);
    return this.messageBus.sendMessage(message);
  }
}

// Coordinator Agent - entry point for the A2A system
class CoordinatorAgent extends BaseAgent {
  async processMessage(message) {
    const { type, payload, id: correlationId } = message;
    await this.logAgentMessage(message, true);
    
    try {
      if (type === "CREATE_VIDEO_REQUEST") {
        // Initial request from user interface
        const taskId = payload.taskId || crypto.randomUUID();
        const { description, projectId } = payload;
        
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Request received, planning scene..."),
          undefined,
          "planning"
        );
        
        // Send to ScenePlanner
        return this.createA2AMessage(
          "PLAN_SCENE_REQUEST",
          taskId,
          "ScenePlannerAgent",
          this.createSimpleTextMessage("Please plan a scene for this video request"),
          undefined,
          correlationId,
          { description, projectId }
        );
      }
      else if (type === "SCENE_PLAN_CREATED") {
        // ScenePlanner finished planning
        const { taskId, scenePlan } = payload;
        
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Scene planned, generating animation design brief..."),
          undefined,
          "generating_adb"
        );
        
        // Send to ADBAgent
        return this.createA2AMessage(
          "GENERATE_DESIGN_BRIEF_REQUEST",
          taskId,
          "ADBAgent",
          this.createSimpleTextMessage("Please generate an animation design brief"),
          undefined,
          correlationId,
          { 
            description: scenePlan.description,
            projectId: payload.projectId,
            sceneId: scenePlan.id
          }
        );
      }
      else if (type === "CREATE_COMPONENT_REQUEST") {
        // ADBAgent generated the ADB
        const { taskId } = payload;
        const adbArtifact = message.artifacts?.[0];
        
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Animation Design Brief created, building component..."),
          message.artifacts,
          "building_component"
        );
        
        // Send to BuilderAgent
        return this.createA2AMessage(
          "BUILD_COMPONENT_REQUEST",
          taskId,
          "BuilderAgent",
          this.createSimpleTextMessage("Please build a component from this ADB"),
          message.artifacts,
          correlationId
        );
      }
      else if (type === "COMPONENT_SYNTAX_ERROR") {
        // Error from BuilderAgent
        const { taskId, componentCode, errors } = payload;
        
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage(`Component has syntax errors: ${errors?.join(", ")}`),
          undefined,
          "fixing_errors"
        );
        
        // Send to ErrorFixerAgent
        return this.createA2AMessage(
          "COMPONENT_SYNTAX_ERROR",
          taskId,
          "ErrorFixerAgent",
          this.createSimpleTextMessage("Please fix the syntax errors in this component"),
          undefined,
          correlationId,
          payload
        );
      }
      else if (type === "COMPONENT_BUILD_SUCCESS") {
        // Success from BuilderAgent
        const { taskId } = payload;
        
        await this.updateTaskState(
          taskId,
          "completed",
          this.createSimpleTextMessage("Component built successfully!"),
          message.artifacts,
          "completed"
        );
        
        // No more messages to send, we're done
        return null;
      }
      else {
        console.warn(`[CoordinatorAgent] Unhandled message type: ${type}`);
        return null;
      }
    } catch (error) {
      console.error(`[CoordinatorAgent] Error processing message: ${error.message}`);
      return null;
    }
  }
}

// Scene Planner Agent - plans scenes based on user requests
class ScenePlannerAgent extends BaseAgent {
  async processMessage(message) {
    const { type, payload, id: correlationId } = message;
    await this.logAgentMessage(message, true);
    
    try {
      if (type === "PLAN_SCENE_REQUEST") {
        const { taskId, description, projectId } = payload;
        
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Planning scene..."),
          undefined,
          "planning"
        );
        
        // Simulate scene planning (would use LLM in real implementation)
        console.log(`[ScenePlannerAgent] Planning scene for: "${description}"`);
        
        // Create a simple scene plan based on the description
        const words = description.split(" ");
        const sceneType = description.toLowerCase().includes("animation") ? "animation" : "video";
        const duration = Math.floor(Math.random() * 5) + 3; // 3-8 seconds
        
        const scenePlan = {
          id: crypto.randomUUID(),
          name: `Scene: ${words.slice(0, 3).join(" ")}...`,
          description: description,
          type: sceneType,
          elements: [],
          transitions: [],
          duration: duration,
          createdAt: new Date().toISOString()
        };
        
        // Add scene elements based on keywords in description
        if (description.toLowerCase().includes("text")) {
          scenePlan.elements.push({
            id: crypto.randomUUID(),
            type: "text",
            content: description.split(" ").slice(0, 5).join(" ") + "...",
            position: { x: "center", y: "center" }
          });
        }
        
        if (description.toLowerCase().includes("logo")) {
          scenePlan.elements.push({
            id: crypto.randomUUID(),
            type: "logo",
            position: { x: "right", y: "bottom" }
          });
        }
        
        // Create a plan artifact
        const planArtifact = {
          id: crypto.randomUUID(),
          type: "data",
          mimeType: "application/json",
          data: scenePlan,
          description: "Scene Plan",
          createdAt: new Date().toISOString(),
          name: `scene-plan-${taskId}.json`
        };
        
        await this.addTaskArtifact(taskId, planArtifact);
        
        await this.updateTaskState(
          taskId,
          "completed",
          this.createSimpleTextMessage("Scene planning completed"),
          [planArtifact],
          "planned"
        );
        
        // Send back to Coordinator
        return this.createA2AMessage(
          "SCENE_PLAN_CREATED",
          taskId,
          "CoordinatorAgent",
          this.createSimpleTextMessage("Scene plan created successfully"),
          [planArtifact],
          correlationId,
          { scenePlan, projectId }
        );
      }
      else {
        console.warn(`[ScenePlannerAgent] Unhandled message type: ${type}`);
        return null;
      }
    } catch (error) {
      console.error(`[ScenePlannerAgent] Error processing message: ${error.message}`);
      return null;
    }
  }
}

// ADB Agent - generates Animation Design Briefs
class ADBAgent extends BaseAgent {
  async processMessage(message) {
    const { type, payload, id: correlationId } = message;
    await this.logAgentMessage(message, true);
    
    try {
      if (type === "GENERATE_DESIGN_BRIEF_REQUEST") {
        const { taskId, description, projectId, sceneId } = payload;
        
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Generating animation design brief..."),
          undefined,
          "generating_adb"
        );
        
        // Simulate ADB generation (would use LLM in real implementation)
        console.log(`[ADBAgent] Generating ADB for: "${description}"`);
        
        // Create a simple ADB based on the description
        const adb = {
          id: crypto.randomUUID(),
          name: `Animation: ${description.substring(0, 30)}...`,
          description: description,
          duration: 90, // 3 seconds at 30fps
          dimensions: { width: 1920, height: 1080 },
          elements: [],
          animations: [],
          metadata: {
            projectId,
            sceneId,
            generatedAt: new Date().toISOString()
          }
        };
        
        // Add elements based on keywords in description
        if (description.toLowerCase().includes("ball") || Math.random() > 0.5) {
          const ballId = "ball";
          adb.elements.push({
            id: ballId,
            type: "shape",
            name: "Ball",
            properties: {
              shape: "circle",
              color: description.toLowerCase().includes("red") ? "#e74c3c" : 
                    description.toLowerCase().includes("blue") ? "#3498db" : 
                    "#f39c12",
              size: 100
            }
          });
          
          // Add animation for the ball
          adb.animations.push({
            elementId: ballId,
            type: "bounce",
            keyframes: [
              { time: 0, y: 0 },
              { time: 45, y: 200 },
              { time: 90, y: 0 }
            ]
          });
        }
        
        // Always add a background
        adb.elements.push({
          id: "background",
          type: "shape",
          name: "Background",
          properties: {
            color: description.toLowerCase().includes("dark") ? "#34495e" : "#ecf0f1"
          }
        });
        
        // Add text if mentioned
        if (description.toLowerCase().includes("text")) {
          const textId = "mainText";
          adb.elements.push({
            id: textId,
            type: "text",
            name: "Main Text",
            properties: {
              content: description.split(" ").slice(0, 3).join(" "),
              fontSize: 48,
              color: "#2c3e50",
              position: { x: "center", y: "center" }
            }
          });
          
          // Add fade-in animation for text
          adb.animations.push({
            elementId: textId,
            type: "fadeIn",
            keyframes: [
              { time: 0, opacity: 0 },
              { time: 30, opacity: 1 }
            ]
          });
        }
        
        // Create an ADB artifact
        const adbArtifact = {
          id: crypto.randomUUID(),
          type: "data",
          mimeType: "application/json",
          data: adb,
          description: "Animation Design Brief",
          createdAt: new Date().toISOString(),
          name: `adb-${taskId}.json`
        };
        
        await this.addTaskArtifact(taskId, adbArtifact);
        
        await this.updateTaskState(
          taskId,
          "completed",
          this.createSimpleTextMessage("Animation design brief generated"),
          [adbArtifact],
          "adb_generated"
        );
        
        // Send to Coordinator for component creation
        return this.createA2AMessage(
          "CREATE_COMPONENT_REQUEST",
          taskId,
          "CoordinatorAgent",
          this.createSimpleTextMessage("Animation design brief generated successfully"),
          [adbArtifact],
          correlationId
        );
      }
      else {
        console.warn(`[ADBAgent] Unhandled message type: ${type}`);
        return null;
      }
    } catch (error) {
      console.error(`[ADBAgent] Error processing message: ${error.message}`);
      return null;
    }
  }
}

// Builder Agent - builds components from ADBs
class BuilderAgent extends BaseAgent {
  async processMessage(message) {
    const { type, payload, id: correlationId } = message;
    await this.logAgentMessage(message, true);
    
    try {
      if (type === "BUILD_COMPONENT_REQUEST") {
        const { taskId } = payload;
        const adbArtifact = message.artifacts?.find(a => a.name?.includes('adb'));
        const adb = adbArtifact?.data;
        
        if (!adb) {
          throw new Error("No Animation Design Brief provided");
        }
        
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Generating component code..."),
          undefined,
          "generating"
        );
        
        // Simulate component code generation
        console.log(`[BuilderAgent] Generating code for ADB: ${adb.name}`);
        
        // Generate basic component code that uses the elements and animations from the ADB
        let componentCode = `import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';\n\n`;
        componentCode += `/**\n * ${adb.name}\n *\n * Generated from Animation Design Brief\n * Duration: ${adb.duration} frames\n */\n`;
        componentCode += `export default function ${adb.name.replace(/[^a-zA-Z0-9]/g, '')}() {\n`;
        componentCode += `  const frame = useCurrentFrame();\n`;
        componentCode += `  const { width, height } = useVideoConfig();\n\n`;
        
        // Add animation calculations for each animated element
        adb.animations.forEach(animation => {
          const element = adb.elements.find(e => e.id === animation.elementId);
          if (!element) return;
          
          const varName = `${element.id}Props`;
          
          // Initialize position object
          componentCode += `  // Animation for ${element.name}\n`;
          componentCode += `  const ${varName} = {\n`;
          componentCode += `    x: 0,\n`;
          componentCode += `    y: 0,\n`;
          componentCode += `    opacity: 1,\n`;
          componentCode += `    rotation: 0\n`;
          componentCode += `  };\n\n`;
          
          // Add specific animation logic
          if (animation.type === 'bounce') {
            componentCode += `  // Bounce animation\n`;
            componentCode += `  ${varName}.y = interpolate(\n`;
            componentCode += `    frame,\n`;
            componentCode += `    [${animation.keyframes.map(k => k.time).join(', ')}],\n`;
            componentCode += `    [${animation.keyframes.map(k => k.y).join(', ')}],\n`;
            componentCode += `    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n`;
            componentCode += `  );\n\n`;
          }
          else if (animation.type === 'fadeIn') {
            componentCode += `  // Fade-in animation\n`;
            componentCode += `  ${varName}.opacity = interpolate(\n`;
            componentCode += `    frame,\n`;
            componentCode += `    [${animation.keyframes.map(k => k.time).join(', ')}],\n`;
            componentCode += `    [${animation.keyframes.map(k => k.opacity).join(', ')}],\n`;
            componentCode += `    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n`;
            componentCode += `  );\n\n`;
          }
        });
        
        // Start JSX
        componentCode += `  return (\n`;
        componentCode += `    <div style={{ position: 'relative', width: '100%', height: '100%' }}>\n`;
        
        // Add background if present
        const background = adb.elements.find(e => e.id === 'background');
        if (background) {
          componentCode += `      {/* Background */}\n`;
          componentCode += `      <div style={{\n`;
          componentCode += `        position: 'absolute',\n`;
          componentCode += `        width: '100%',\n`;
          componentCode += `        height: '100%',\n`;
          componentCode += `        backgroundColor: '${background.properties.color || '#ffffff'}'\n`;
          componentCode += `      }} />\n\n`;
        }
        
        // Add other elements
        adb.elements.forEach(element => {
          if (element.id === 'background') return; // Already handled
          
          const hasAnimation = adb.animations.some(a => a.elementId === element.id);
          const propsVar = hasAnimation ? `${element.id}Props` : null;
          
          if (element.type === 'shape' && element.properties.shape === 'circle') {
            componentCode += `      {/* ${element.name} */}\n`;
            componentCode += `      <div style={{\n`;
            componentCode += `        position: 'absolute',\n`;
            componentCode += `        width: ${element.properties.size || 100},\n`;
            componentCode += `        height: ${element.properties.size || 100},\n`;
            componentCode += `        borderRadius: '50%',\n`;
            componentCode += `        backgroundColor: '${element.properties.color || '#000000'}',\n`;
            
            if (hasAnimation) {
              componentCode += `        transform: \`translate3d(\${${propsVar}.x}px, \${${propsVar}.y}px, 0) rotate(\${${propsVar}.rotation}deg)\`,\n`;
              componentCode += `        opacity: ${propsVar}.opacity,\n`;
            } else {
              componentCode += `        left: 'calc(50% - ${(element.properties.size || 100) / 2}px)',\n`;
              componentCode += `        top: 'calc(50% - ${(element.properties.size || 100) / 2}px)',\n`;
            }
            
            componentCode += `      }} />\n\n`;
          }
          else if (element.type === 'text') {
            componentCode += `      {/* ${element.name} */}\n`;
            componentCode += `      <div style={{\n`;
            componentCode += `        position: 'absolute',\n`;
            componentCode += `        fontSize: ${element.properties.fontSize || 32},\n`;
            componentCode += `        color: '${element.properties.color || '#000000'}',\n`;
            componentCode += `        fontFamily: 'Arial, sans-serif',\n`;
            componentCode += `        left: '50%',\n`;
            componentCode += `        top: '50%',\n`;
            componentCode += `        transform: 'translate(-50%, -50%)',\n`;
            
            if (hasAnimation) {
              componentCode += `        opacity: ${propsVar}.opacity,\n`;
            }
            
            componentCode += `      }}>\n`;
            componentCode += `        ${element.properties.content || 'Text'}\n`;
            componentCode += `      </div>\n\n`;
          }
        });
        
        // Close JSX
        componentCode += `    </div>\n`;
        componentCode += `  );\n`;
        componentCode += `}`;
        
        // Should we introduce a syntax error?
        const shouldFail = false; // Set to true to test error handling
        
        if (shouldFail) {
          // Introduce a syntax error for testing
          componentCode = componentCode.replace('return (', 'SYNTAX_ERROR return (');
        }
        
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
        
        // Simulate build process
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Building component..."),
          undefined,
          "building"
        );
        
        console.log(`[BuilderAgent] Building component...`);
        
        // Check for errors
        if (shouldFail) {
          await this.updateTaskState(
            taskId,
            "working",
            this.createSimpleTextMessage("Component has syntax errors"),
            undefined,
            "build_failed"
          );
          
          return this.createA2AMessage(
            "COMPONENT_SYNTAX_ERROR",
            taskId,
            "CoordinatorAgent",
            this.createSimpleTextMessage("Component has syntax errors"),
            undefined,
            correlationId,
            {
              componentCode,
              errors: ["Line 7: Syntax error detected: Unexpected token 'return'"],
              animationDesignBrief: adb
            }
          );
        }
        
        // Simulate successful build
        const componentName = adb.name.replace(/[^a-zA-Z0-9]/g, '') || 'GeneratedComponent';
        const outputUrl = `/r2/components/${componentName}-${Date.now()}.js`;
        
        // Create build artifact
        const buildArtifact = {
          id: crypto.randomUUID(),
          type: "file",
          mimeType: "application/javascript",
          url: outputUrl,
          description: "Built Component",
          createdAt: new Date().toISOString(),
          name: `component-${taskId}.js`
        };
        
        await this.addTaskArtifact(taskId, buildArtifact);
        
        await this.updateTaskState(
          taskId,
          "completed",
          this.createSimpleTextMessage("Component built successfully"),
          [buildArtifact],
          "built"
        );
        
        return this.createA2AMessage(
          "COMPONENT_BUILD_SUCCESS",
          taskId,
          "CoordinatorAgent",
          this.createSimpleTextMessage("Component built successfully"),
          [buildArtifact],
          correlationId
        );
      }
      else if (type === "REBUILD_COMPONENT_REQUEST") {
        // Handle rebuild requests from ErrorFixerAgent
        const { taskId, fixedCode } = payload;
        
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Rebuilding component with fixed code..."),
          undefined,
          "building"
        );
        
        console.log(`[BuilderAgent] Rebuilding component with fixed code`);
        
        // Simulate successful rebuild
        const componentName = payload.animationDesignBrief?.name.replace(/[^a-zA-Z0-9]/g, '') || 'FixedComponent';
        const outputUrl = `/r2/components/${componentName}-fixed-${Date.now()}.js`;
        
        // Create rebuilt artifact
        const rebuiltArtifact = {
          id: crypto.randomUUID(),
          type: "file",
          mimeType: "application/javascript",
          url: outputUrl,
          description: "Rebuilt Component",
          createdAt: new Date().toISOString(),
          name: `component-fixed-${taskId}.js`
        };
        
        await this.addTaskArtifact(taskId, rebuiltArtifact);
        
        await this.updateTaskState(
          taskId,
          "completed",
          this.createSimpleTextMessage("Component rebuilt successfully"),
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
      }
      else {
        console.warn(`[BuilderAgent] Unhandled message type: ${type}`);
        return null;
      }
    } catch (error) {
      console.error(`[BuilderAgent] Error processing message: ${error.message}`);
      return null;
    }
  }
}

// Error Fixer Agent - fixes component code errors
class ErrorFixerAgent extends BaseAgent {
  async processMessage(message) {
    const { type, payload, id: correlationId } = message;
    await this.logAgentMessage(message, true);
    
    try {
      if (type === "COMPONENT_SYNTAX_ERROR") {
        const { taskId, componentCode, errors, animationDesignBrief } = payload;
        
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Analyzing component errors..."),
          undefined,
          "fixing"
        );
        
        console.log(`[ErrorFixerAgent] Fixing errors: ${errors.join(", ")}`);
        
        // Simulate code fixing (would use LLM in real implementation)
        let fixedCode = componentCode;
        
        if (componentCode.includes('SYNTAX_ERROR')) {
          fixedCode = componentCode.replace('SYNTAX_ERROR', '');
        }
        
        // Create fixed code artifact
        const fixedCodeArtifact = {
          id: crypto.randomUUID(),
          type: "data",
          mimeType: "application/javascript",
          data: fixedCode,
          description: "Fixed Component Code",
          createdAt: new Date().toISOString(),
          name: `component-fixed-${taskId}.js`
        };
        
        await this.addTaskArtifact(taskId, fixedCodeArtifact);
        
        // Create fix report
        const fixReportArtifact = {
          id: crypto.randomUUID(),
          type: "data",
          mimeType: "application/json",
          data: {
            originalErrors: errors,
            fixesApplied: 1,
            fixDetails: [{
              type: "Syntax error",
              explanation: "Removed invalid syntax token",
              original: "SYNTAX_ERROR return (",
              fixed: "return ("
            }]
          },
          description: "Error Fix Report",
          createdAt: new Date().toISOString(),
          name: `fix-report-${taskId}.json`
        };
        
        await this.addTaskArtifact(taskId, fixReportArtifact);
        
        await this.updateTaskState(
          taskId,
          "working",
          this.createSimpleTextMessage("Component errors fixed successfully"),
          [fixedCodeArtifact, fixReportArtifact],
          "generating"
        );
        
        // Send to BuilderAgent for rebuild
        return this.createA2AMessage(
          "REBUILD_COMPONENT_REQUEST",
          taskId,
          "BuilderAgent",
          this.createSimpleTextMessage("Component code fixed. Requesting rebuild."),
          [fixedCodeArtifact],
          correlationId,
          {
            fixedCode,
            animationDesignBrief
          }
        );
      }
      else {
        console.warn(`[ErrorFixerAgent] Unhandled message type: ${type}`);
        return null;
      }
    } catch (error) {
      console.error(`[ErrorFixerAgent] Error processing message: ${error.message}`);
      return null;
    }
  }
}

// Test function for full agent flow
async function testEndToEndFlow() {
  console.log("=== Testing End-to-End A2A Flow ===\n");
  
  // Create shared task manager and message bus
  const taskManager = new MockTaskManager();
  const messageBus = new MockMessageBus();
  
  // Create and register all agents
  const coordinator = new CoordinatorAgent("CoordinatorAgent", taskManager, messageBus);
  const scenePlanner = new ScenePlannerAgent("ScenePlannerAgent", taskManager, messageBus);
  const adbAgent = new ADBAgent("ADBAgent", taskManager, messageBus);
  const builderAgent = new BuilderAgent("BuilderAgent", taskManager, messageBus);
  const errorFixerAgent = new ErrorFixerAgent("ErrorFixerAgent", taskManager, messageBus);
  
  messageBus.registerAgent("CoordinatorAgent", coordinator);
  messageBus.registerAgent("ScenePlannerAgent", scenePlanner);
  messageBus.registerAgent("ADBAgent", adbAgent);
  messageBus.registerAgent("BuilderAgent", builderAgent);
  messageBus.registerAgent("ErrorFixerAgent", errorFixerAgent);
  
  // Create initial task ID
  const taskId = crypto.randomUUID();
  console.log(`Test Task ID: ${taskId}\n`);
  
  // Create initial request message (simulating UI)
  const initialRequest = {
    type: "CREATE_VIDEO_REQUEST",
    payload: {
      taskId,
      description: "Create a short video with a red ball bouncing on a blue background with text",
      projectId: "test-project-id"
    },
    id: crypto.randomUUID(),
    from: "UserInterface",
    to: "CoordinatorAgent"
  };
  
  console.log("=== Starting A2A Flow ===");
  console.log(`Initial request: ${initialRequest.payload.description}\n`);
  
  // Start the flow by sending the initial message
  let currentMessage = initialRequest;
  let responseMessage = null;
  let messageCount = 0;
  
  // Follow the message chain until complete or max iterations
  const MAX_ITERATIONS = 10;
  
  while (currentMessage && messageCount < MAX_ITERATIONS) {
    messageCount++;
    console.log(`--- Step ${messageCount}: ${currentMessage.type} ---`);
    
    // Send the current message
    responseMessage = await messageBus.sendMessage(currentMessage);
    
    // Break if no response
    if (!responseMessage) {
      console.log("No response message, flow complete or stopped");
      break;
    }
    
    // Set up for next iteration
    currentMessage = responseMessage;
  }
  
  // Show final task state
  console.log("\n=== Final Task State ===");
  const task = await taskManager.getTask(taskId);
  console.log(`Status: ${task?.state}`);
  console.log(`Message: ${task?.message?.parts?.[0]?.text}`);
  
  // Show artifacts
  console.log("\n=== Final Task Artifacts ===");
  const artifacts = await taskManager.getTaskArtifacts(taskId);
  console.log(`Total artifacts: ${artifacts.length}`);
  
  artifacts.forEach((artifact, i) => {
    console.log(`\nArtifact ${i+1}: ${artifact.name}`);
    console.log(`Type: ${artifact.type}, ${artifact.mimeType}`);
    
    if (artifact.name.includes('component-code')) {
      // Print a preview of the component code
      console.log("\nCode Preview:");
      const codeLines = artifact.data.split('\n').slice(0, 10);
      console.log(codeLines.join('\n') + '\n... [truncated]');
    }
    else if (artifact.name.includes('adb')) {
      // Print a preview of the ADB
      console.log("\nADB Preview:");
      if (artifact.data) {
        const adb = artifact.data;
        console.log(`- Name: ${adb.name}`);
        console.log(`- Elements: ${adb.elements.length}`);
        console.log(`- Animations: ${adb.animations.length}`);
      }
    }
  });
  
  // Show message flow summary
  console.log("\n=== Message Flow Summary ===");
  const messages = messageBus.getMessageHistory();
  console.log(`Total messages: ${messages.length}`);
  
  messages.forEach((msg, i) => {
    console.log(`${i+1}. ${msg.from} -> ${msg.to}: ${msg.type}`);
  });
  
  return {
    task,
    artifacts,
    messages
  };
}

// Run the test
testEndToEndFlow().catch(console.error); 