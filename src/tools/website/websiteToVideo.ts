/**
 * Website to Video Tool
 * Analyzes a website and generates a complete video with hero's journey narrative
 */

import type { ToolExecutionResult } from "~/lib/types/ai/tools.types";

export interface WebsiteToVideoInput {
  websiteUrl: string;
  style?: 'minimal' | 'dynamic' | 'bold';
  duration?: number; // Target duration in seconds
}

export class WebsiteToVideoTool {
  name = "websiteToVideo";
  
  async execute(input: WebsiteToVideoInput): Promise<ToolExecutionResult> {
    console.log('🌐 [WEBSITE TOOL] Starting website analysis for:', input.websiteUrl);
    
    // This tool acts as a coordinator - the actual work is done by the pipeline
    // We return instructions for the router to call the website pipeline
    
    return {
      success: true,
      toolName: this.name,
      data: {
        action: 'generate-from-website',
        websiteUrl: input.websiteUrl,
        style: input.style || 'dynamic',
        duration: input.duration || 20,
      },
      reasoning: `Analyzing ${input.websiteUrl} to create a branded video with hero's journey narrative`,
      chatResponse: `I'll analyze ${input.websiteUrl} and create a professional video with your brand style and content. This will include:\n\n• Extracting your brand colors, fonts, and visual style\n• Creating a compelling narrative structure\n• Generating 5 scenes following the hero's journey\n• Total duration: ${input.duration || 20} seconds\n\nStarting analysis now...`,
    };
  }
  
  /**
   * Check if a prompt contains a website URL
   */
  static isWebsiteRequest(prompt: string): boolean {
    // Check for explicit website URLs
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const hasUrl = urlPattern.test(prompt);
    
    // Check for website-related keywords
    const websiteKeywords = [
      'analyze website',
      'from website',
      'website to video',
      'my website',
      'our website',
      'the website',
      'from url',
      'analyze url',
    ];
    
    const hasKeywords = websiteKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword)
    );
    
    return hasUrl || hasKeywords;
  }
  
  /**
   * Extract website URL from prompt
   */
  static extractUrl(prompt: string): string | null {
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const match = prompt.match(urlPattern);
    return match ? match[0] : null;
  }
}