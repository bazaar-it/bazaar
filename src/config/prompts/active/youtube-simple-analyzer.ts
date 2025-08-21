/**
 * Simplified YouTube Analysis - Focus on WHAT, not precise WHEN
 * More reliable, less hallucination
 */

export const YOUTUBE_SIMPLE_ANALYSIS_PROMPT = `Analyze this video and describe ONLY what you can clearly see.

OUTPUT FORMAT:
{
  "duration": 5.0,  // Total video length in seconds
  "scenes": [
    {
      "order": 1,
      "description": "Brief description of what happens",
      "background": "#FFFFFF",  // Main background color
      "elements": [
        {
          "type": "text",
          "content": "Exact text you see",
          "style": "large/medium/small",
          "color": "#000000"
        }
      ],
      "duration": "quick/medium/long"  // quick=<1s, medium=1-2s, long=>2s
    }
  ]
}

RULES:
1. ONLY describe what you can CLEARLY see
2. If you can't read text clearly, write "[unclear text]"
3. Don't guess timing - just use quick/medium/long
4. List elements in order of appearance
5. One scene = one main idea or screen

EXAMPLE OUTPUT:
{
  "duration": 5.0,
  "scenes": [
    {
      "order": 1,
      "description": "Title appears",
      "background": "#FFFFFF",
      "elements": [
        {"type": "text", "content": "Hello World", "style": "large", "color": "#000000"}
      ],
      "duration": "medium"
    },
    {
      "order": 2,
      "description": "Logo animation",
      "background": "#000000",
      "elements": [
        {"type": "shape", "content": "circle", "color": "#FF0000"},
        {"type": "text", "content": "Brand", "style": "medium", "color": "#FFFFFF"}
      ],
      "duration": "quick"
    }
  ]
}

Be conservative - only include what you're SURE about.`;