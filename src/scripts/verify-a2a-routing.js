// @ts-nocheck
// src/scripts/verify-a2a-routing.js
// Real A2A system test implementation that interacts with the actual A2A endpoints

// ES Module version of the verification script
import { default as nodeFetch } from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - Read from environment variables or use default
const API_PORT = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3000';
const API_HOST = process.env.API_HOST || 'localhost';
const API_BASE = `http://${API_HOST}:${API_PORT}/api/trpc`;

console.log(`Using API base URL: ${API_BASE}`);
// You can override this by setting environment variables:
// PORT=4000 node src/scripts/verify-a2a-routing.js

// Use tmp directory for logs to avoid HMR issues
const LOG_DIR = path.join(__dirname, '../../tmp/a2a-test-logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Agents to test and their test messages
// These can be adjusted based on your actual agent registry
const AGENTS = [
  'CoordinatorAgent',
  'BuilderAgent',
  'UIAgent',
  'ErrorFixerAgent',
  'R2StorageAgent'
];

// Test messages for each agent
const TEST_MESSAGES = {
  'CoordinatorAgent': 'Plan a video about space exploration',
  'BuilderAgent': 'Build component for space animation',
  'UIAgent': 'Update interface with new component',
  'ErrorFixerAgent': 'Fix errors in component code',
  'R2StorageAgent': 'Store video assets in R2 bucket',
  // Add fallback for any agent not specifically listed
  'default': 'Hello, this is a test message from the A2A verification script'
};

// Create a log file for the test
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const logFile = path.join(LOG_DIR, `a2a-test-${timestamp}.log`);
fs.writeFileSync(logFile, `--- A2A Testing Started at ${new Date().toISOString()} ---\n`);

/**
 * Log helper - writes to console and log file
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to include in log file (but not console)
 */
const log = (message, data = null) => {
  console.log(message);
  let logMessage = `${new Date().toISOString()} - ${message}`;
  
  // Add data as JSON if provided
  if (data) {
    try {
      logMessage += `\n${JSON.stringify(data, null, 2)}`;
    } catch (err) {
      logMessage += `\n[Error serializing data: ${err.message}]`;
    }
  }
  
  fs.appendFileSync(logFile, logMessage + '\n');
};

/**
 * Test a specific agent with a sample message
 * @param {string} agentName - Name of the agent to test
 * @returns {Promise<{taskId: string, status: string, statusMessage: string}|null>}
 */
async function testAgent(agentName) {
  try {
    log(`\n=== Testing ${agentName} ===`);
    
    // Use imported fetch function
    const fetch = nodeFetch;
    
    // Prepare the request payload
    const messageText = TEST_MESSAGES[agentName] || TEST_MESSAGES.default;
    const payload = {
      json: {
        agentName,
        message: messageText
      }
    };
    
    log(`Sending to ${agentName}: "${messageText}"`);
    
    // Send test message to agent
    const response = await fetch(`${API_BASE}/a2aTest.pingAgent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    // Handle error response from API
    if (result.error) {
      log(`Error from API: ${result.error.message || JSON.stringify(result.error)}`);
      return null;
    }
    
    // Extract task ID from response
    const taskId = result.result?.data?.taskId;
    if (!taskId) {
      log(`Error: No taskId returned from API response`, result);
      return null;
    }
    
    log(`Task created: ${taskId}`);
    
    // Poll for task status
    let status = 'submitted';
    let statusMessage = '';
    let attempts = 0;
    let artifacts = [];
    
    // Poll for up to 30 seconds
    while (['submitted', 'working'].includes(status) && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const statusResponse = await fetch(
          `${API_BASE}/a2aTest.getTaskStatus?input=${encodeURIComponent(JSON.stringify({ taskId }))}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        const statusResult = await statusResponse.json();
        
        // Check for API errors
        if (statusResult.error) {
          log(`Error checking status: ${statusResult.error.message || JSON.stringify(statusResult.error)}`);
          attempts++;
          continue;
        }
        
        // Extract status data
        const data = statusResult.result?.data;
        if (data) {
          const newStatus = data.status;
          let newMessage = '';
          
          // Extract message text depending on message format
          if (data.message?.parts && data.message.parts.length > 0) {
            newMessage = data.message.parts[0].text || '';
          } else if (data.message?.text) {
            newMessage = data.message.text;
          } else if (typeof data.message === 'string') {
            newMessage = data.message;
          }
          
          // Track artifacts if present
          if (data.artifacts && data.artifacts.length > 0) {
            artifacts = data.artifacts;
          }
          
          // Only log if something changed
          if (status !== newStatus || statusMessage !== newMessage) {
            status = newStatus;
            statusMessage = newMessage;
            log(`Status: ${status} - ${statusMessage || 'No message'}`);
            
            // Log artifacts if they exist
            if (artifacts.length > 0) {
              log(`Artifacts received: ${artifacts.length}`, artifacts);
            }
          }
        }
      } catch (error) {
        log(`Error polling status: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      attempts++;
    }
    
    if (attempts >= 30 && ['submitted', 'working'].includes(status)) {
      log(`Warning: Test timeout for ${agentName} after 30 seconds`);  
    }
    
    return { 
      taskId, 
      status, 
      statusMessage,
      artifacts,
      success: status === 'completed'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error testing ${agentName}: ${errorMessage}`);
    return null;
  }
}

// Check if a specific agent was requested as command line arg
const requestedAgent = process.argv[2];

/**
 * Main test function to verify all A2A agents
 * @returns {Promise<{success: boolean, results: Array}>}
 */
async function runTests() {
  log('Starting A2A agent verification');
  const fetch = nodeFetch;
  const results = [];
  let availableAgents = [];
  
  // Try to list available agents first
  try {
    const agentResponse = await fetch(`${API_BASE}/a2aTest.listAgents`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const agentResult = await agentResponse.json();
    if (agentResult.result && agentResult.result.data) {
      availableAgents = agentResult.result.data.map(a => a.name);
      log(`Available agents from API: ${availableAgents.join(', ')}`);
      
      // Optional: update AGENTS array with actual available agents
      if (availableAgents.length > 0 && !requestedAgent) {
        log('Using agents returned from API for testing');
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error listing agents: ${errorMessage}`);
  }
  
  // Determine which agents to test
  let agentsToTest = [];
  
  if (requestedAgent) {
    // If a specific agent was requested, prioritize testing that one
    agentsToTest = [requestedAgent];
    log(`Testing requested agent: ${requestedAgent}`);
  } else {
    // If API returned agents, use those that match our test config
    if (availableAgents.length > 0) {
      agentsToTest = AGENTS.filter(agent => availableAgents.includes(agent));
      log(`Testing ${agentsToTest.length} agents from predefined list`);
    } else {
      // Fallback to our predefined list
      agentsToTest = AGENTS;
      log(`Using predefined agent list: ${AGENTS.join(', ')}`);
    }
  }
  
  if (agentsToTest.length === 0) {
    log(`Error: No agents to test`);
    return { success: false, results: [] };
  }
  
  // Test each agent
  log(`Will test ${agentsToTest.length} agents: ${agentsToTest.join(', ')}`);
  
  let allSuccess = true;
  
  for (const agent of agentsToTest) {
    const result = await testAgent(agent);
    
    if (result) {
      results.push({ 
        agent, 
        ...result,
        timestamp: new Date().toISOString()
      });
      
      log(`${agent} test complete. Final status: ${result.status}`);
      
      // Track overall success
      if (result.status !== 'completed') {
        allSuccess = false;
      }
    } else {
      results.push({ 
        agent, 
        status: 'error',
        success: false,
        timestamp: new Date().toISOString() 
      });
      allSuccess = false;
    }
  }
  
  // Summarize results
  log('\n=== Test Summary ===');
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    log(`${icon} ${result.agent}: ${result.status || 'error'}`);
  });
  
  log(`A2A verification ${allSuccess ? 'PASSED' : 'FAILED'}: ${results.length} agents tested`);
  
  return {
    success: allSuccess,
    results
  };
}

// Execute main function
runTests()
  .then(result => {
    log('A2A verification complete', result);
    
    if (result.success) {
      console.log('\n✅ A2A TEST PASSED: All agents responded successfully!');
    } else {
      console.log('\n❌ A2A TEST FAILED: Some agents failed to respond correctly.');
    }
    
    // Write results to a JSON file for reference
    const resultsPath = path.join(LOG_DIR, `a2a-test-results-${timestamp}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2));
    console.log(`\nTest results saved to ${resultsPath}`);
    console.log(`Log file: ${logFile}`);
    
    // Exit after a delay to allow logs to flush
    setTimeout(() => process.exit(result.success ? 0 : 1), 500);
  })
  .catch(err => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`FATAL ERROR: ${errorMessage}`);
    process.exit(1);
  });
