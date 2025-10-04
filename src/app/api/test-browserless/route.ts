import { NextResponse } from 'next/server';
import * as playwrightCore from 'playwright-core';

export async function GET() {
  const startTime = Date.now();

  try {
    // Check if env var is set
    if (!process.env.BROWSERLESS_URL) {
      return NextResponse.json({
        success: false,
        error: 'BROWSERLESS_URL environment variable is not set',
        duration: Date.now() - startTime,
      });
    }

    console.log('[Browserless Test] Attempting connection to:', process.env.BROWSERLESS_URL.substring(0, 50) + '...');

    // Try to connect
    const browser = await playwrightCore.chromium.connect(process.env.BROWSERLESS_URL, {
      timeout: 30000 // 30 second timeout
    });

    console.log('[Browserless Test] Connected successfully');

    // Try to create a context and page
    const context = await browser.newContext();
    const page = await context.newPage();

    // Try to navigate to a simple page
    await page.goto('https://example.com', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    const title = await page.title();

    // Cleanup
    await page.close();
    await context.close();
    await browser.close();

    const duration = Date.now() - startTime;

    console.log('[Browserless Test] Test completed successfully in', duration, 'ms');

    return NextResponse.json({
      success: true,
      message: 'Browserless connection and page navigation successful',
      pageTitle: title,
      duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error('[Browserless Test] Failed:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      errorType: error.constructor?.name,
      duration,
      timestamp: new Date().toISOString(),
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
    });
  }
}
