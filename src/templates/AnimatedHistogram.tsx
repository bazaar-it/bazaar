import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig
} from 'remotion';

const script_mer2yohf = [
  { type: 'chart', text: 'Animated Histogram', frames: 120 },
  { type: 'hold', text: 'Final Display', frames: 30 }
];

const sequences_mer2yohf: any[] = [];
let accumulatedFrames_mer2yohf = 0;

script_mer2yohf.forEach((segment, index) => {
  sequences_mer2yohf.push({
    ...segment,
    start: accumulatedFrames_mer2yohf,
    end: accumulatedFrames_mer2yohf + segment.frames
  });
  accumulatedFrames_mer2yohf += segment.frames;
});

const totalFrames_mer2yohf = script_mer2yohf.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_mer2yohf = totalFrames_mer2yohf;

export default function AnimatedHistogram() {
  // Load fonts for preview/template rendering
  if (typeof window !== 'undefined' && (window as any).RemotionGoogleFonts) {
    (window as any).RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "500", "600"] });
  }
  
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const histogramData = [
    { label: '512', value: 512 },
    { label: '240', value: 240, highlight: true },
    { label: '480', value: 480 },
    { label: '360', value: 360 },
    { label: '440', value: 440, highlight: true },
    { label: '640', value: 640 },
    { label: '480', value: 480 },
    { label: '360', value: 360, highlight: true }
  ];

  function HistogramChart({ progress }: { progress: number }) {
    const maxValue = Math.max(...histogramData.map(d => d.value));
    const chartWidth = 600;
    const maxChartHeight = 500; // Increased for better spacing
    const chartX = (width - chartWidth) / 2;
    const chartY = (height - maxChartHeight) / 2; // Centered vertically
    const barWidth = (chartWidth - 80) / histogramData.length;
    const padding = 8;
    
    const visibleBars = Math.floor(progress * histogramData.length);
    
    return (
      <div 
        style={{
          position: 'absolute',
          left: chartX,
          top: chartY,
          width: chartWidth,
          height: maxChartHeight,
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Chart Title */}
        <div style={{
          fontSize: '48px',
          fontWeight: '600',
          color: '#2d3748',
          marginBottom: '8px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          Pill Shaped Bar Chart
        </div>
        
        {/* Check Level Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '64px', // Increased padding between title and bars
          fontSize: '32px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#ff6b35',
            borderRadius: '50%',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: 'white',
            fontWeight: 'bold'
          }}>✓</div>
          <span style={{ color: '#ff6b35', fontWeight: '500' }}>Check Something</span>
        </div>
        
        {/* Chart Container with Fixed Layout */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Bars Container */}
          <div style={{
            height: '280px', // Fixed height for bars area
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '20px' // Fixed gap between bars and labels
          }}>
            {histogramData.map((data, index) => {
              const barHeight = interpolate(
                data.value,
                [0, maxValue],
                [20, 260] // Fixed max height within the bars container
              );
              
              const animatedHeight = index < visibleBars 
                ? spring({
                    frame: frame - (index * 6),
                    fps,
                    config: { damping: 12, stiffness: 100 }
                  }) * barHeight
                : index === visibleBars
                ? interpolate(
                    progress * histogramData.length - visibleBars,
                    [0, 1],
                    [0, barHeight]
                  )
                : 0;
              
              // Determine bar color - bars 2, 5, and 7 should be orange
              const isOrangeBar = index === 2 || index === 5 || index === 7;
              const barColor = isOrangeBar ? '#ff6b35' : '#c7d2e7';
              
              return (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: barWidth - padding
                }}>
                  {/* Bar with rounded pill shape */}
                  <div style={{
                    width: barWidth - padding,
                    height: Math.max(0, animatedHeight),
                    backgroundColor: barColor,
                    borderRadius: `${(barWidth - padding) / 2}px`,
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}>
                    {/* White circle indicator inside orange bars */}
                    {isOrangeBar && animatedHeight > 40 && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        borderRadius: '50%'
                      }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* X-axis labels - Fixed position container */}
          <div style={{
            height: '30px', // Fixed height for labels
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {histogramData.map((data, index) => (
              <div key={index} style={{
                fontSize: '16px',
                color: '#4a5568',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '600',
                width: barWidth - padding,
                textAlign: 'center'
              }}>
                {data.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.min(frame / 120, 1);

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)' }}>
      <HistogramChart progress={Math.max(0, progress)} />
    </AbsoluteFill>
  );
}

// Template configuration
export const templateConfig = {
  id: 'animated-histogram',
  name: 'Animated Histogram',
  duration: 150, // 5 seconds
  previewFrame: 75,
  getCode: () => `const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion;

const script_mer2yohf = [
  { type: 'chart', text: 'Animated Histogram', frames: 120 },
  { type: 'hold', text: 'Final Display', frames: 30 }
];

const sequences_mer2yohf = [];
let accumulatedFrames_mer2yohf = 0;

script_mer2yohf.forEach((segment, index) => {
  sequences_mer2yohf.push({
    ...segment,
    start: accumulatedFrames_mer2yohf,
    end: accumulatedFrames_mer2yohf + segment.frames
  });
  accumulatedFrames_mer2yohf += segment.frames;
});

const totalFrames_mer2yohf = script_mer2yohf.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_mer2yohf = totalFrames_mer2yohf;

export default function TemplateScene() {
  window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "500", "600"] });
  
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const histogramData = [
    { label: '512', value: 512 },
    { label: '240', value: 240, highlight: true },
    { label: '480', value: 480 },
    { label: '360', value: 360 },
    { label: '440', value: 440, highlight: true },
    { label: '640', value: 640 },
    { label: '480', value: 480 },
    { label: '360', value: 360, highlight: true }
  ];

  function HistogramChart({ progress }) {
    const maxValue = Math.max(...histogramData.map(d => d.value));
    const chartWidth = 600;
    const maxChartHeight = 500; // Increased for better spacing
    const chartX = (width - chartWidth) / 2;
    const chartY = (height - maxChartHeight) / 2; // Centered vertically
    const barWidth = (chartWidth - 80) / histogramData.length;
    const padding = 8;
    
    const visibleBars = Math.floor(progress * histogramData.length);
    
    return (
      <div 
        style={{
          position: 'absolute',
          left: chartX,
          top: chartY,
          width: chartWidth,
          height: maxChartHeight,
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Chart Title */}
        <div style={{
          fontSize: '48px',
          fontWeight: '600',
          color: '#2d3748',
          marginBottom: '8px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          Pill Shaped Bar Chart
        </div>
        
        {/* Check Level Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '64px', // Increased padding between title and bars
          fontSize: '32px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#ff6b35',
            borderRadius: '50%',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: 'white',
            fontWeight: 'bold'
          }}>✓</div>
          <span style={{ color: '#ff6b35', fontWeight: '500' }}>Check Something</span>
        </div>
        
        {/* Chart Container with Fixed Layout */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Bars Container */}
          <div style={{
            height: '280px', // Fixed height for bars area
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '20px' // Fixed gap between bars and labels
          }}>
            {histogramData.map((data, index) => {
              const barHeight = interpolate(
                data.value,
                [0, maxValue],
                [20, 260] // Fixed max height within the bars container
              );
              
              const animatedHeight = index < visibleBars 
                ? spring({
                    frame: frame - (index * 6),
                    fps,
                    config: { damping: 12, stiffness: 100 }
                  }) * barHeight
                : index === visibleBars
                ? interpolate(
                    progress * histogramData.length - visibleBars,
                    [0, 1],
                    [0, barHeight]
                  )
                : 0;
              
              // Determine bar color - bars 2, 5, and 7 should be orange
              const isOrangeBar = index === 2 || index === 5 || index === 7;
              const barColor = isOrangeBar ? '#ff6b35' : '#c7d2e7';
              
              return (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: barWidth - padding
                }}>
                  {/* Bar with rounded pill shape */}
                  <div style={{
                    width: barWidth - padding,
                    height: Math.max(0, animatedHeight),
                    backgroundColor: barColor,
                    borderRadius: \`\${(barWidth - padding) / 2}px\`,
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}>
                    {/* White circle indicator inside orange bars */}
                    {isOrangeBar && animatedHeight > 40 && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        borderRadius: '50%'
                      }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* X-axis labels - Fixed position container */}
          <div style={{
            height: '30px', // Fixed height for labels
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {histogramData.map((data, index) => (
              <div key={index} style={{
                fontSize: '16px',
                color: '#4a5568',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '600',
                width: barWidth - padding,
                textAlign: 'center'
              }}>
                {data.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.min(frame / 120, 1);

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)' }}>
      <HistogramChart progress={Math.max(0, progress)} />
    </AbsoluteFill>
  );
}`,
  supportedFormats: ['landscape', 'portrait', 'square'] as const,
  category: 'data' as const,
  tags: ['chart', 'histogram', 'data', 'animation', 'bars'] as const,
};
