import { NextResponse } from 'next/server';
import { WebAnalysisAgentV4 } from '~/tools/webAnalysis/WebAnalysisAgentV4';
import { convertV4ToSimplified } from '~/tools/webAnalysis/brandDataAdapter';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    console.log('🔍 Testing brand extraction for:', url);
    
    // Run V4 extraction
    const analyzer = new WebAnalysisAgentV4('test-project');
    const v4Data = await analyzer.analyze(url);
    
    // Convert to simplified format
    const simplifiedData = convertV4ToSimplified(v4Data);
    
    // Check if we got real data or fallback
    const isRealExtraction = v4Data.metadata && 
      v4Data.brand?.identity?.name &&
      v4Data.brand?.visual?.colors?.primary;
    
    return NextResponse.json({
      success: true,
      isRealExtraction,
      extractionStatus: isRealExtraction ? 'success' : 'fallback',
      v4Data,
      simplifiedData,
      debug: {
        hasScreenshots: (v4Data.screenshots?.length || 0) > 0,
        hasBrandColors: !!v4Data.brand?.visual?.colors,
        hasProductInfo: !!v4Data.product,
        hasContent: !!v4Data.content
      }
    });
    
  } catch (error: any) {
    console.error('Brand extraction test failed:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}