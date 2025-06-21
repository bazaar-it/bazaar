import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const message = `data: ${JSON.stringify({ 
        type: 'connected', 
        timestamp: Date.now() 
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMsg = `data: ${JSON.stringify({ 
            type: 'heartbeat', 
            timestamp: Date.now() 
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeatMsg));
        } catch (error) {
          clearInterval(heartbeat);
          controller.close();
        }
      }, 30000); // Send heartbeat every 30 seconds

      // Store cleanup function
      (request as any).cleanup = () => {
        clearInterval(heartbeat);
        controller.close();
      };
    },
    cancel() {
      // Cleanup when client disconnects
      if ((request as any).cleanup) {
        (request as any).cleanup();
      }
    }
  });

  return new Response(stream, { headers });
}

export async function POST(request: NextRequest) {
  // This endpoint would be called by the test execution system
  // to send updates to connected clients
  try {
    const body = await request.json();
    
    // In a real implementation, you'd broadcast this to all connected SSE clients
    // For now, just return success
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 