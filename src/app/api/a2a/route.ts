import { NextRequest, NextResponse } from "next/server";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { JsonRpcRequest, JsonRpcErrorResponse, JsonRpcSuccessResponse } from "~/types/a2a";

/**
 * A2A JSON-RPC 2.0 API endpoint
 * 
 * Implements the Google A2A protocol for task management
 * @see https://github.com/google/A2A/blob/main/docs/tasks.md
 */
export async function POST(req: NextRequest) {
  // Parse JSON-RPC request
  let jsonRpcRequest: JsonRpcRequest;
  
  try {
    jsonRpcRequest = await req.json();
  } catch (error: any) {
    // Return error for invalid JSON
    return createErrorResponse({
      code: -32700,
      message: "Parse error",
      data: process.env.NODE_ENV === "development" ? error.message : undefined
    }, null);
  }
  
  // Validate JSON-RPC request
  if (jsonRpcRequest.jsonrpc !== "2.0" || !jsonRpcRequest.method) {
    return createErrorResponse({
      code: -32600,
      message: "Invalid Request"
    }, jsonRpcRequest.id || null);
  }
  
  // Handle methods
  try {
    switch (jsonRpcRequest.method) {
      case "tasks/create":
        // Validate required parameters
        if (!jsonRpcRequest.params?.projectId) {
          return createErrorResponse({
            code: -32602,
            message: "Invalid params: projectId is required"
          }, jsonRpcRequest.id);
        }
        
        const task = await taskManager.createTask(
          jsonRpcRequest.params.projectId,
          jsonRpcRequest.params
        );
        
        return createSuccessResponse(task, jsonRpcRequest.id);
        
      case "tasks/get":
        // Validate required parameters
        if (!jsonRpcRequest.params?.id) {
          return createErrorResponse({
            code: -32602,
            message: "Invalid params: id is required"
          }, jsonRpcRequest.id);
        }
        
        const taskStatus = await taskManager.getTaskStatus(
          jsonRpcRequest.params.id
        );
        
        return createSuccessResponse(taskStatus, jsonRpcRequest.id);
      
      case "tasks/cancel":
        // Validate required parameters
        if (!jsonRpcRequest.params?.id) {
          return createErrorResponse({
            code: -32602,
            message: "Invalid params: id is required"
          }, jsonRpcRequest.id);
        }
        
        await taskManager.cancelTask(jsonRpcRequest.params.id);
        return createSuccessResponse({ success: true }, jsonRpcRequest.id);
      
      case "tasks/input":
        // Validate required parameters
        if (!jsonRpcRequest.params?.id || !jsonRpcRequest.params?.message) {
          return createErrorResponse({
            code: -32602,
            message: "Invalid params: id and message are required"
          }, jsonRpcRequest.id);
        }
        
        await taskManager.submitTaskInput(
          jsonRpcRequest.params.id,
          jsonRpcRequest.params.message
        );
        
        return createSuccessResponse({ success: true }, jsonRpcRequest.id);
      
      // Other method handlers...
      
      default:
        return createErrorResponse({
          code: -32601,
          message: "Method not found"
        }, jsonRpcRequest.id);
    }
  } catch (error: any) {
    console.error("A2A JSON-RPC Error:", error);
    return createErrorResponse({
      code: -32603,
      message: "Internal error",
      data: process.env.NODE_ENV === "development" ? error.message : undefined
    }, jsonRpcRequest.id);
  }
}

/**
 * Create a JSON-RPC 2.0 success response
 */
function createSuccessResponse(result: any, id: string | number): NextResponse<JsonRpcSuccessResponse> {
  return NextResponse.json({
    jsonrpc: "2.0",
    result,
    id
  });
}

/**
 * Create a JSON-RPC 2.0 error response
 */
function createErrorResponse(
  error: { code: number; message: string; data?: any },
  id: string | number | null
): NextResponse<JsonRpcErrorResponse> {
  return NextResponse.json({
    jsonrpc: "2.0",
    error,
    id
  }, { status: getHttpStatusCode(error.code) });
}

/**
 * Map JSON-RPC error codes to HTTP status codes
 */
function getHttpStatusCode(rpcErrorCode: number): number {
  switch (rpcErrorCode) {
    case -32700: // Parse error
      return 400;
    case -32600: // Invalid Request
      return 400;
    case -32601: // Method not found
      return 404;
    case -32602: // Invalid params
      return 400;
    case -32603: // Internal error
    default:
      return 500;
  }
} 