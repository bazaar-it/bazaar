const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion;
const { IconifyIcon } = window;

const script_histogram = [
  { type: 'chart', text: 'Animated Histogram', frames: 120 },
  { type: 'hold', text: 'Final Display', frames: 30 }
];

const sequences_histogram = [];
let accumulatedFrames_histogram = 0;

script_histogram.forEach((segment, index) => {
  sequences_histogram.push({
    ...segment,
    start: accumulatedFrames_histogram,
    end: accumulatedFrames_histogram + segment.frames
  });
  accumulatedFrames_histogram += segment.frames;
});

const totalFrames_histogram = script_histogram.reduce((sum, s) => sum + s.frames, 0);
export const durationInFrames_histogram = totalFrames_histogram;

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
    // FIXED: Static dimensions to prevent layout shift
    const chartWidth = 700; // Fixed width, not dynamic
    const chartHeight = 600; // Fixed total height
    const chartX = (width - chartWidth) / 2;
    const chartY = (height - chartHeight) / 2;
    const barWidth = 60; // Fixed bar width
    const barSpacing = 10; // Fixed spacing between bars
    const totalBarsWidth = (barWidth * histogramData.length) + (barSpacing * (histogramData.length - 1));
    const startX = (chartWidth - totalBarsWidth) / 2; // Center bars within chart
    
    const visibleBars = Math.floor(progress * histogramData.length);
    
    return (
      <div 
        style={{
          position: 'absolute',
          left: chartX,
          top: chartY,
          width: chartWidth, // Fixed width
          height: chartHeight, // Fixed height
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          padding: '32px',
          boxSizing: 'border-box'
        }}
      >
        {/* Fixed header container with absolute positioning */}
        <div style={{
          position: 'absolute',
          top: '32px',
          left: '32px',
          right: '32px',
          height: '60px' // Fixed height for title area
        }}>
          {/* Title and Icon in fixed positions */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            fontSize: '42px',
            fontWeight: '600',
            color: '#2d3748',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            whiteSpace: 'nowrap'
          }}>
            Pill Shaped Bar Chart
          </div>
          
          {/* Claude icon with fixed position */}
          <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            opacity: spring({
              frame: frame - 30,
              fps,
              config: { damping: 12, stiffness: 200 }
            })
          }}>
            <IconifyIcon 
              icon="logos:claude" 
              style={{ 
                fontSize: '48px',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))'
              }} 
            />
          </div>
        </div>
        
        {/* Check indicator with fixed position */}
        <div style={{
          position: 'absolute',
          top: '110px',
          left: '32px',
          display: 'flex',
          alignItems: 'center',
          fontSize: '28px',
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
        
        {/* Chart area with fixed dimensions and position */}
        <div style={{
          position: 'absolute',
          top: '180px', // Fixed top position after header
          left: '32px',
          right: '32px',
          bottom: '32px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Bars container with fixed layout */}
          <div style={{
            position: 'relative',
            height: '320px', // Fixed height for bars
            width: '100%'
          }}>
            {histogramData.map((data, index) => {
              const barHeight = interpolate(
                data.value,
                [0, maxValue],
                [20, 300] // Fixed max bar height
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
              
              // Bars 1 (index 1), 4 (index 4), and 7 (index 7) should be orange
              const isOrangeBar = index === 1 || index === 4 || index === 7;
              const barColor = isOrangeBar ? '#ff6b35' : '#c7d2e7';
              
              return (
                <div key={index} style={{
                  position: 'absolute',
                  left: startX + (index * (barWidth + barSpacing)),
                  bottom: 0,
                  width: barWidth,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center'
                }}>
                  {/* Bar with pill shape */}
                  <div style={{
                    width: barWidth,
                    height: Math.max(0, animatedHeight),
                    backgroundColor: barColor,
                    borderRadius: `${barWidth / 2}px`,
                    position: 'relative'
                  }}>
                    {/* White circle indicator for orange bars */}
                    {isOrangeBar && animatedHeight > 40 && (
                      <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
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
          
          {/* X-axis labels with fixed positions */}
          <div style={{
            position: 'relative',
            height: '40px',
            marginTop: '20px'
          }}>
            {histogramData.map((data, index) => (
              <div key={index} style={{
                position: 'absolute',
                left: startX + (index * (barWidth + barSpacing)),
                width: barWidth,
                textAlign: 'center',
                fontSize: '16px',
                color: '#4a5568',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '600'
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