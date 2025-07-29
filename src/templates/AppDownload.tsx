import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function AppDownload() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  const radius = 280;
  const circumference = 2 * Math.PI * radius;
  
  const progress = interpolate(frame, [0, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  const strokeDashoffset = circumference * (1 - progress);
  
  const labelOpacity = interpolate(frame, [0, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  const labelY = interpolate(frame, [0, 45], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Inter",
      position: "relative"
    }}>
      
      {/* Gradient background */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #2a2a2a 0%, #3d8a4d 100%)",
        zIndex: 0
      }} />
      
      <div style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "50px"
      }}>
        
        <div style={{
          position: "relative",
          width: "560px",
          height: "560px"
        }}>
          
          <svg style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "560px",
            height: "560px",
            pointerEvents: "none"
          }}>
            <defs>
              <mask id="circularMask-appdownload">
                <rect width="560" height="560" fill="black" />
                <circle
                  cx="280"
                  cy="280"
                  r={radius}
                  fill="none"
                  stroke="white"
                  strokeWidth="560"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 280 280)"
                />
              </mask>
            </defs>
          </svg>
          
          {/* Background WhatsApp icon */}
          <div style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "560px",
            height: "560px",
            borderRadius: "120px",
            background: "#25D366",
            opacity: "0.3",
            filter: "grayscale(0.5)"
          }}>
            {typeof window !== 'undefined' && window.IconifyIcon ? (
              <window.IconifyIcon 
                icon="logos:whatsapp-icon" 
                style={{
                  fontSize: "420px",
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  color: "white"
                }} 
              />
            ) : (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "160px",
                color: "white",
                fontWeight: "bold"
              }}>
                W
              </div>
            )}
          </div>
          
          {/* Revealed WhatsApp icon */}
          <div style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "560px",
            height: "560px",
            borderRadius: "120px",
            background: "#25D366",
            mask: "url(#circularMask-appdownload)",
            WebkitMask: "url(#circularMask-appdownload)"
          }}>
            {typeof window !== 'undefined' && window.IconifyIcon ? (
              <window.IconifyIcon 
                icon="logos:whatsapp-icon" 
                style={{
                  fontSize: "420px",
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  color: "white"
                }} 
              />
            ) : (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "160px",
                color: "white",
                fontWeight: "bold"
              }}>
                W
              </div>
            )}
          </div>
        </div>
        
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          opacity: labelOpacity,
          transform: `translateY(${labelY}px)`
        }}>
          {typeof window !== 'undefined' && window.IconifyIcon ? (
            <window.IconifyIcon 
              icon="heroicons:cloud-arrow-down-20-solid" 
              style={{
                fontSize: "42px",
                color: "white"
              }} 
            />
          ) : (
            <div style={{
              width: "42px",
              height: "42px",
              backgroundColor: "white",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              color: "#2a2a2a"
            }}>
              ↓
            </div>
          )}
          <span style={{
            fontSize: "36px",
            fontWeight: "600",
            color: "white",
            textShadow: "0 3px 6px rgba(0,0,0,0.5)"
          }}>
            WhatsApp
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'app-download',
  name: 'App Download',
  duration: 180, // 6 seconds
  previewFrame: 90,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function AppDownload() {
  window.RemotionGoogleFonts.loadFont("Inter", { weights: ["500", "600"] });
  
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  const radius = 280;
  const circumference = 2 * Math.PI * radius;
  
  const progress = interpolate(frame, [0, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  const strokeDashoffset = circumference * (1 - progress);
  
  const labelOpacity = interpolate(frame, [0, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  const labelY = interpolate(frame, [0, 45], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Inter",
      position: "relative"
    }}>
      
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #2a2a2a 0%, #3d8a4d 100%)",
        zIndex: 0
      }} />
      
      <div style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "50px"
      }}>
        
        <div style={{
          position: "relative",
          width: "560px",
          height: "560px"
        }}>
          
          <svg style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "560px",
            height: "560px",
            pointerEvents: "none"
          }}>
            <defs>
              <mask id="circularMask">
                <rect width="560" height="560" fill="black" />
                <circle
                  cx="280"
                  cy="280"
                  r={radius}
                  fill="none"
                  stroke="white"
                  strokeWidth="560"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 280 280)"
                />
              </mask>
            </defs>
          </svg>
          
          <div style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "560px",
            height: "560px",
            borderRadius: "120px",
            background: "#25D366",
            opacity: "0.3",
            filter: "grayscale(0.5)"
          }}>
            <window.IconifyIcon 
              icon="logos:whatsapp-icon" 
              style={{
                fontSize: "420px",
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "white"
              }} 
            />
          </div>
          
          <div style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "560px",
            height: "560px",
            borderRadius: "120px",
            background: "#25D366",
            mask: "url(#circularMask)",
            WebkitMask: "url(#circularMask)"
          }}>
            <window.IconifyIcon 
              icon="logos:whatsapp-icon" 
              style={{
                fontSize: "420px",
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "white"
              }} 
            />
          </div>
        </div>
        
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          opacity: labelOpacity,
          transform: \`translateY(\${labelY}px)\`
        }}>
          <window.IconifyIcon 
            icon="heroicons:cloud-arrow-down-20-solid" 
            style={{
              fontSize: "42px",
              color: "white"
            }} 
          />
          <span style={{
            fontSize: "36px",
            fontWeight: "600",
            color: "white",
            textShadow: "0 3px 6px rgba(0,0,0,0.5)"
          }}>
            WhatsApp
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}`
}; 