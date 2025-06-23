import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} from 'remotion';
import React from 'react';

const GradientCircle: React.FC<{
  x: number;
  y: number;
  size: number;
  color1: string;
  color2: string;
  opacity: number;
}> = ({ x, y, size, color1, color2, opacity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color1}, ${color2})`,
        opacity: 0.6 * opacity,
        filter: 'blur(60px)',
      }}
    />
  );
};

const PhoneFrame: React.FC<{
  opacity: number;
  children: React.ReactNode;
}> = ({ opacity, children }) => {
  const frame = useCurrentFrame();
  
  const timeProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        width: '320px',
        height: '650px',
        background: 'white',
        borderRadius: '32px',
        position: 'relative',
        overflow: 'hidden',
        opacity,
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div
        style={{
          height: '40px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white',
          position: 'relative',
          zIndex: 2,
          opacity: timeProgress,
          transform: `translateY(${interpolate(timeProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        <div style={{ 
          fontSize: '14px',
          fontFamily: 'Space Grotesk, system-ui, -apple-system, sans-serif',
          fontWeight: 700,
        }}>
          9:41
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ marginRight: '6px' }}>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {children}
    </div>
  );
};

const ProfileCard: React.FC<{
  delay: number;
}> = ({ delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          opacity: progress,
          transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '28px',
            background: '#FF6B6B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div>
          <div
            style={{
              fontSize: '20px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontWeight: 700,
              color: '#1A1A1A',
            }}
          >
            Adewale Taiwo
          </div>
          <div
            style={{
              fontSize: '14px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              color: '#FF6B6B',
            }}
          >
            House Manager
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 107, 107, 0.1)',
            padding: '20px',
            borderRadius: '20px',
            opacity: progress,
            transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              color: '#666666',
              marginBottom: '6px',
            }}
          >
            Wallet Balance
          </div>
          <div
            style={{
              fontSize: '20px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontWeight: 700,
              color: '#FF6B6B',
            }}
          >
            $5046.57
          </div>
        </div>

        <div
          style={{
            background: '#FF6B6B',
            padding: '20px',
            borderRadius: '20px',
            color: 'white',
            opacity: progress,
            transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              marginBottom: '6px',
            }}
          >
            Master Card
          </div>
          <div
            style={{
              fontSize: '14px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontWeight: 500,
            }}
          >
            5999-XXXX
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkerCard: React.FC<{
  name: string;
  delay: number;
}> = ({ name, delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        background: 'white',
        padding: '12px',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        opacity: progress,
        transform: `scale(${progress})`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '20px',
          background: '#FF6B6B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
        }}
      >
        {name === 'Add Workers' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        )}
      </div>
      <div
        style={{
          fontSize: '12px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 500,
          color: '#1A1A1A',
          textAlign: 'center',
        }}
      >
        {name}
      </div>
    </div>
  );
};

const ServiceCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  delay: number;
}> = ({ icon, title, delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        background: 'white',
        padding: '20px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        opacity: progress,
        transform: `translateX(${interpolate(progress, [0, 1], [50, 0])}px)`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ fontSize: '28px', color: '#FF6B6B' }}>{icon}</div>
      <div
        style={{
          fontSize: '16px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 500,
          color: '#1A1A1A',
        }}
      >
        {title}
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{
  title: string;
  delay: number;
  showAll?: boolean;
}> = ({ title, delay, showAll }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
      }}
    >
      <div
        style={{
          fontSize: '18px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 700,
          color: '#1A1A1A',
        }}
      >
        {title}
      </div>
      {showAll && (
        <div
          style={{
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            color: '#FF6B6B',
          }}
        >
          All
        </div>
      )}
    </div>
  );
};

const MobileApp: React.FC = () => {
  const frame = useCurrentFrame();
  
  const mainProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <GradientCircle
        x={150}
        y={150}
        size={400}
        color1="#FF6B6B"
        color2="#FFA07A"
        opacity={mainProgress}
      />
      <GradientCircle
        x={1000}
        y={150}
        size={400}
        color1="#FF8C42"
        color2="#FF6B6B"
        opacity={mainProgress}
      />
      <GradientCircle
        x={600}
        y={600}
        size={400}
        color1="#FFA07A"
        color2="#FF8C42"
        opacity={mainProgress}
      />

      <PhoneFrame opacity={mainProgress}>
        <div
          style={{
            height: '100%',
            overflow: 'auto',
            background: '#F8F9FA',
          }}
        >
          <ProfileCard delay={8} />

          <div style={{ padding: '0 20px 20px' }}>
            <SectionTitle title="Houses" delay={15} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
              }}
            >
              <WorkerCard name="Add Workers" delay={18} />
              <WorkerCard name="Tobi Lateef" delay={20} />
              <WorkerCard name="Queen Needle" delay={22} />
              <WorkerCard name="Joan Blessing" delay={24} />
            </div>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <SectionTitle title="Services" delay={30} showAll />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <ServiceCard 
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.5 2.54l2.6 1.53c.56-1.24.9-2.62.9-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.06-4.09l-2.6-1.53C16.17 17.98 14.21 19 12 19z"/>
                  </svg>
                } 
                title="Electrical" 
                delay={32} 
              />
              <ServiceCard 
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                  </svg>
                } 
                title="Others" 
                delay={34} 
              />
            </div>
          </div>
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'mobile-app',
  name: 'Mobile App',
  duration: 90,
  previewFrame: 45,
  getCode: () => `const {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} = window.Remotion;

const GradientCircle = ({ x, y, size, color1, color2, opacity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: \`radial-gradient(circle at 30% 30%, \${color1}, \${color2})\`,
        opacity: 0.6 * opacity,
        filter: 'blur(60px)',
      }}
    />
  );
};

const PhoneFrame = ({ opacity, children }) => {
  const frame = useCurrentFrame();
  
  const timeProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        width: '320px',
        height: '650px',
        background: 'white',
        borderRadius: '32px',
        position: 'relative',
        overflow: 'hidden',
        opacity,
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div
        style={{
          height: '40px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white',
          position: 'relative',
          zIndex: 2,
          opacity: timeProgress,
          transform: \`translateY(\${interpolate(timeProgress, [0, 1], [20, 0])}px)\`,
        }}
      >
        <div style={{ 
          fontSize: '14px',
          fontFamily: 'Space Grotesk, system-ui, -apple-system, sans-serif',
          fontWeight: 700,
        }}>
          9:41
        </div>
        <div style={{ fontSize: '14px' }}>
          <span style={{ marginRight: '6px' }}>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {children}
    </div>
  );
};

const ProfileCard = ({ delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          opacity: progress,
          transform: \`translateY(\${interpolate(progress, [0, 1], [20, 0])}px)\`,
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '28px',
            background: '#FF6B6B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div>
          <div
            style={{
              fontSize: '20px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontWeight: 700,
              color: '#1A1A1A',
            }}
          >
            Adewale Taiwo
          </div>
          <div
            style={{
              fontSize: '14px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              color: '#FF6B6B',
            }}
          >
            House Manager
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 107, 107, 0.1)',
            padding: '20px',
            borderRadius: '20px',
            opacity: progress,
            transform: \`translateY(\${interpolate(progress, [0, 1], [20, 0])}px)\`,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              color: '#666666',
              marginBottom: '6px',
            }}
          >
            Wallet Balance
          </div>
          <div
            style={{
              fontSize: '20px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontWeight: 700,
              color: '#FF6B6B',
            }}
          >
            $5046.57
          </div>
        </div>

        <div
          style={{
            background: '#FF6B6B',
            padding: '20px',
            borderRadius: '20px',
            color: 'white',
            opacity: progress,
            transform: \`translateY(\${interpolate(progress, [0, 1], [20, 0])}px)\`,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              marginBottom: '6px',
            }}
          >
            Master Card
          </div>
          <div
            style={{
              fontSize: '14px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontWeight: 500,
            }}
          >
            5999-XXXX
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkerCard = ({ name, delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        background: 'white',
        padding: '12px',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        opacity: progress,
        transform: \`scale(\${progress})\`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '20px',
          background: '#FF6B6B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
        }}
      >
        {name === 'Add Workers' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        )}
      </div>
      <div
        style={{
          fontSize: '12px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 500,
          color: '#1A1A1A',
          textAlign: 'center',
        }}
      >
        {name}
      </div>
    </div>
  );
};

const ServiceCard = ({ icon, title, delay }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        background: 'white',
        padding: '20px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        opacity: progress,
        transform: \`translateX(\${interpolate(progress, [0, 1], [50, 0])}px)\`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ fontSize: '28px', color: '#FF6B6B' }}>{icon}</div>
      <div
        style={{
          fontSize: '16px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 500,
          color: '#1A1A1A',
        }}
      >
        {title}
      </div>
    </div>
  );
};

const SectionTitle = ({ title, delay, showAll }) => {
  const frame = useCurrentFrame();
  
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        opacity: progress,
        transform: \`translateY(\${interpolate(progress, [0, 1], [20, 0])}px)\`,
      }}
    >
      <div
        style={{
          fontSize: '18px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontWeight: 700,
          color: '#1A1A1A',
        }}
      >
        {title}
      </div>
      {showAll && (
        <div
          style={{
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            color: '#FF6B6B',
          }}
        >
          All
        </div>
      )}
    </div>
  );
};

export default function MobileApp() {
  const frame = useCurrentFrame();
  
  const mainProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <GradientCircle
        x={150}
        y={150}
        size={400}
        color1="#FF6B6B"
        color2="#FFA07A"
        opacity={mainProgress}
      />
      <GradientCircle
        x={1000}
        y={150}
        size={400}
        color1="#FF8C42"
        color2="#FF6B6B"
        opacity={mainProgress}
      />
      <GradientCircle
        x={600}
        y={600}
        size={400}
        color1="#FFA07A"
        color2="#FF8C42"
        opacity={mainProgress}
      />

      <PhoneFrame opacity={mainProgress}>
        <div
          style={{
            height: '100%',
            overflow: 'auto',
            background: '#F8F9FA',
          }}
        >
          <ProfileCard delay={8} />

          <div style={{ padding: '0 20px 20px' }}>
            <SectionTitle title="Houses" delay={15} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
              }}
            >
              <WorkerCard name="Add Workers" delay={18} />
              <WorkerCard name="Tobi Lateef" delay={20} />
              <WorkerCard name="Queen Needle" delay={22} />
              <WorkerCard name="Joan Blessing" delay={24} />
            </div>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <SectionTitle title="Services" delay={30} showAll />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <ServiceCard 
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.5 2.54l2.6 1.53c.56-1.24.9-2.62.9-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.06-4.09l-2.6-1.53C16.17 17.98 14.21 19 12 19z"/>
                  </svg>
                } 
                title="Electrical" 
                delay={32} 
              />
              <ServiceCard 
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                  </svg>
                } 
                title="Others" 
                delay={34} 
              />
            </div>
          </div>
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
}`,
};

export default MobileApp; 