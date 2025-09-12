// src/templates/FintechUI.tsx
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';

// @ts-ignore - Window globals from Remotion Player (guard SSR)
const IconifyIcon = typeof window !== 'undefined' ? (window as any).IconifyIcon : undefined;

const ChatMessage = ({ text, isUser, delay }: { text: string; isUser: boolean; delay: number }) => {
  const frame = useCurrentFrame();
  const progress = spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "16px 20px",
          borderRadius: 20,
          background: isUser ? "#007AFF" : "#E9ECEF",
          color: isUser ? "white" : "#212529",
          fontFamily: "sans-serif",
          fontSize: 16,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const InputBar = ({ opacity }: { opacity: number }) => {
  const frame = useCurrentFrame();
  const text = "This dashboard looks perfect for freelancers!";
  const charCount = Math.floor(interpolate(frame, [0, 150], [0, text.length], { extrapolateRight: "clamp" }));

  return (
    <div
      style={{
        minHeight: 100,
        background: "white",
        borderRadius: 20,
        display: "flex",
        flexDirection: "column",
        padding: 16,
        opacity,
        transform: `translateY(${interpolate(opacity, [0, 1], [20, 0])}px)`,
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
        border: "1px solid #E5E5E5",
        position: "relative",
      }}
    >
      <div
        style={{
          flex: 1,
          color: "#212529",
          fontFamily: "sans-serif",
          fontSize: 16,
          lineHeight: 1.5,
          display: "flex",
          alignItems: "flex-start",
          paddingTop: 4,
        }}
      >
        <span>{text.slice(0, charCount)}</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 8,
        }}
      >
        <button
          style={{
            background: "#000000",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: "600",
            cursor: "pointer",
            fontFamily: "sans-serif",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

const AnimatedValue = ({ start, end, prefix = "", suffix = "", delay = 0 }: { start: number; end: number; prefix?: string; suffix?: string; delay?: number }) => {
  const frame = useCurrentFrame();
  const value = Math.floor(interpolate(frame - delay, [0, 60], [start, end], { extrapolateRight: "clamp" }));
  return <span style={{ fontWeight: "600", fontFamily: "sans-serif", color: "#1a1a1a" }}>{prefix}{value.toLocaleString()}{suffix}</span>;
};

const ProgressBar = ({ percentage, color, delay = 0 }: { percentage: number; color: string; delay?: number }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, 60], [0, percentage], { extrapolateRight: "clamp" });

  return (
    <div style={{ width: "100%", height: "8px", background: "#F3F4F6", borderRadius: "4px", overflow: "hidden" }}>
      <div style={{
        width: `${progress}%`,
        height: "100%",
        background: color,
        borderRadius: "4px"
      }} />
    </div>
  );
};

const MyWalletSection = () => {
  const frame = useCurrentFrame();
  const anim = (delay: number) => spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });
  
  const currencies = [
    { code: 'USD', flag: '🇺🇸', amount: '$342.50', limit: 'Limit is $10k a month', status: 'Active', statusColor: '#10B981' },
    { code: 'EUR', flag: '🇩🇪', amount: '€287.30', limit: 'Limit is €8k a month', status: 'Active', statusColor: '#10B981' },
    { code: 'BDT', flag: '🇧🇩', amount: '৳41,890.00', limit: 'Limit is ৳10k a month', status: 'Active', statusColor: '#10B981' },
    { code: 'GBP', flag: '🇬🇧', amount: '£198.75', limit: 'Limit is £7.5k a month', status: 'Inactive', statusColor: '#EF4444' }
  ];
  
  return (
    <div style={{ 
      opacity: anim(45),
      background: "#F9FAFB",
      border: "1px solid #E5E7EB",
      borderRadius: "12px",
      padding: "20px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: "600", margin: 0 }}>My Wallet</h3>
        <button style={{
          background: "white",
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: 14,
          fontWeight: "500",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#374151"
        }}>
          {IconifyIcon && <IconifyIcon icon="mdi:plus" style={{ fontSize: 14 }} />}
          Add New
        </button>
      </div>
      <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 20 }}>Today 1 USD = 122.20 BDT</div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {currencies.map((currency, i) => (
          <div key={i} style={{
            background: "white",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            padding: "16px",
            position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{currency.flag}</span>
                <span style={{ fontSize: 16, fontWeight: "600" }}>{currency.code}</span>
              </div>
              {IconifyIcon && <IconifyIcon icon="mdi:dots-vertical" style={{ fontSize: 16, color: "#9CA3AF" }} />}
            </div>
            
            <div style={{ fontSize: 24, fontWeight: "700", marginBottom: 4 }}>
              {currency.amount}
            </div>
            
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
              {currency.limit}
            </div>
            
            <div style={{ 
              fontSize: 12, 
              fontWeight: "500",
              color: currency.statusColor
            }}>
              {currency.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SavingsGoalsSection = ({ opacity }: { opacity: number }) => {
  const frame = useCurrentFrame();
  const anim = (delay: number) => spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });
  
  return (
    <div style={{ 
      opacity: anim(55),
      background: "#F9FAFB",
      border: "1px solid #E5E7EB",
      borderRadius: "12px",
      padding: "20px"
    }}>
      <h3 style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>Savings Goals</h3>
      
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#4F46E5", display: "flex", alignItems: "center", gap: 6 }}>
            {IconifyIcon && <IconifyIcon icon="mdi:home" style={{ fontSize: 16 }} />}
            Dream House
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Target: $75,849.00</div>
          <div style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>$84,857.00</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>72%</div>
          <ProgressBar percentage={72} color="#4F46E5" delay={65} />
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#F59E0B", display: "flex", alignItems: "center", gap: 6 }}>
            {IconifyIcon && <IconifyIcon icon="mdi:school" style={{ fontSize: 16 }} />}
            Education
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Target: $65,445.00</div>
          <div style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>$53,949.00</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>84%</div>
          <ProgressBar percentage={84} color="#F59E0B" delay={70} />
        </div>
      </div>
    </div>
  );
};

const PreviewPanel = ({ opacity }: { opacity: number }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const anim = (delay: number) => spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });

  return (
    <div style={{ 
      flex: 1, 
      background: "white", 
      borderRadius: 16, 
      opacity, 
      position: "relative", 
      overflow: "hidden", 
      padding: 32,
      color: "#1a1a1a", 
      fontFamily: "sans-serif",
      display: "flex",
      flexDirection: "column",
      height: "100%"
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 32,
        opacity: anim(0)
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: "600", margin: 0 }}>Welcome, Jerry</h1>
          {IconifyIcon && <IconifyIcon icon="mdi:fire" style={{ fontSize: 24, color: "#FF6B35" }} />}
        </div>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 16,
          fontSize: 16,
          color: "#6B7280"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {IconifyIcon && <IconifyIcon icon="mdi:calendar" style={{ fontSize: 16 }} />}
            <span>16 May 2024</span>
          </div>
          <button style={{
            background: "#4F46E5",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            {IconifyIcon && <IconifyIcon icon="mdi:export" style={{ fontSize: 14 }} />}
            Share
          </button>
        </div>
      </div>

      {/* Top Stats Row with Containers */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr 1fr 1fr", 
        gap: 20, 
        marginBottom: 32,
        opacity: anim(15)
      }}>
        {/* Cash Balance Container */}
        <div style={{
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontSize: 16, color: "#6B7280", margin: 0, fontWeight: "500" }}>Cash Balance</h3>
            {IconifyIcon && <IconifyIcon icon="mdi:information-outline" style={{ fontSize: 16, color: "#9CA3AF" }} />}
          </div>
          <div style={{ fontSize: 32, fontWeight: "700", marginBottom: 4 }}>
            $<AnimatedValue start={20000} end={24847} prefix="" suffix="" delay={20} />
          </div>
          <div style={{ fontSize: 14, color: "#10B981", display: "flex", alignItems: "center", gap: 4 }}>
            {IconifyIcon && <IconifyIcon icon="mdi:trending-up" style={{ fontSize: 14 }} />}
            16.8%
          </div>
        </div>
        
        {/* Savings Container */}
        <div style={{
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontSize: 16, color: "#6B7280", margin: 0, fontWeight: "500" }}>Total Savings</h3>
            {IconifyIcon && <IconifyIcon icon="mdi:information-outline" style={{ fontSize: 16, color: "#9CA3AF" }} />}
          </div>
          <div style={{ fontSize: 32, fontWeight: "700", marginBottom: 4 }}>
            $<AnimatedValue start={85000} end={93845} prefix="" suffix="" delay={25} />
          </div>
          <div style={{ fontSize: 14, color: "#10B981", display: "flex", alignItems: "center", gap: 4 }}>
            {IconifyIcon && <IconifyIcon icon="mdi:trending-up" style={{ fontSize: 14 }} />}
            16.8%
          </div>
        </div>
        
        <div style={{
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontSize: 16, color: "#6B7280", margin: 0, fontWeight: "500" }}>Monthly Spent</h3>
            {IconifyIcon && <IconifyIcon icon="mdi:information-outline" style={{ fontSize: 16, color: "#9CA3AF" }} />}
          </div>
          <div style={{ fontSize: 32, fontWeight: "700", marginBottom: 4 }}>
            $<AnimatedValue start={40000} end={4562} prefix="" suffix="" delay={30} />
          </div>
          <div style={{ fontSize: 14, color: "#10B981", display: "flex", alignItems: "center", gap: 4 }}>
            {IconifyIcon && <IconifyIcon icon="mdi:trending-up" style={{ fontSize: 14 }} />}
            16.5%
          </div>
        </div>
        
        <div style={{
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontSize: 16, color: "#6B7280", margin: 0, fontWeight: "500" }}>Monthly Income</h3>
            {IconifyIcon && <IconifyIcon icon="mdi:information-outline" style={{ fontSize: 16, color: "#9CA3AF" }} />}
          </div>
          <div style={{ fontSize: 32, fontWeight: "700", marginBottom: 4 }}>
            $<AnimatedValue start={80000} end={8488} prefix="" suffix="" delay={35} />
          </div>
          <div style={{ fontSize: 14, color: "#EF4444", display: "flex", alignItems: "center", gap: 4 }}>
            {IconifyIcon && <IconifyIcon icon="mdi:trending-down" style={{ fontSize: 14 }} />}
            12.8%
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, flex: 1 }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Recent Activity Section */}
          <div style={{ opacity: anim(40), flex: 1, display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>Recent Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              {[
                { name: "PayPal", date: "16 Jul 2024", amount: "+848.84", color: "#003087", icon: "mdi:paypal" },
                { name: "Wise", date: "15 Jul 2024", amount: "-665.56", color: "#00B9FF", icon: "mdi:bank-transfer" },
                { name: "Atlassian", date: "14 Jul 2024", amount: "+546.84", color: "#0052CC", icon: "mdi:atlassian" },
                { name: "Dropbox", date: "13 Jul 2024", amount: "-738.59", color: "#0061FF", icon: "mdi:dropbox" },
                { name: "Spotify", date: "12 Jul 2024", amount: "-15.99", color: "#1DB954", icon: "mdi:spotify" },
                { name: "Amazon", date: "11 Jul 2024", amount: "-234.67", color: "#FF9900", icon: "mdi:amazon" },
                { name: "Netflix", date: "10 Jul 2024", amount: "-12.99", color: "#E50914", icon: "mdi:netflix" },
                { name: "Uber", date: "09 Jul 2024", amount: "-28.45", color: "#000000", icon: "mdi:car" },
                { name: "Starbucks", date: "08 Jul 2024", amount: "-6.75", color: "#00704A", icon: "mdi:coffee" },
                { name: "Apple", date: "07 Jul 2024", amount: "-99.99", color: "#007AFF", icon: "mdi:apple" }
              ].map((item, i) => (
                <div key={i} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  padding: "12px 16px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: item.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white"
                    }}>
                      {IconifyIcon && <IconifyIcon icon={item.icon} style={{ fontSize: 16 }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: "500" }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>{item.date}</div>
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: "600",
                    color: item.amount.startsWith("+") ? "#10B981" : "#EF4444"
                  }}>
                    {item.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* My Wallet Section */}
          <MyWalletSection opacity={anim(45)} />
          
          {/* Savings Goals */}
          <SavingsGoalsSection opacity={anim(55)} />
        </div>
      </div>
    </div>
  );
};

export default function FintechUI() {
  const frame = useCurrentFrame();
  const progress = spring({ frame, fps: 30, config: { damping: 20, stiffness: 80 } });
  const messages = [
    { text: "I need a finance dashboard for my freelance business.", isUser: true, delay: 0 },
    { text: "Perfect! What features would help you manage your freelance finances?", isUser: false, delay: 15 },
    { text: "Income tracking, expense monitoring, savings goals, and client payment history.", isUser: true, delay: 30 },
    { text: "Great! Here's a freelancer-focused finance dashboard with all those features.", isUser: false, delay: 45 },
    { text: "This is exactly what I need! The multi-currency support is perfect for international clients.", isUser: true, delay: 60 },
    { text: "Should we add project-based budgeting and tax preparation features?", isUser: false, delay: 75 },
    { text: "Yes! And maybe quarterly earnings reports for tax filing.", isUser: true, delay: 90 },
    { text: "Excellent idea! I'll add those freelancer-specific financial tools.", isUser: false, delay: 105 },
  ];

  return (
    <AbsoluteFill style={{ background: "#F8F9FA" }}>
      <div style={{ display: "flex", height: "100%", padding: 32, gap: 32 }}>
        <div style={{ width: "30%", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto", paddingRight: 20 }}>
            {messages.map((msg, i) => <ChatMessage key={i} {...msg} />)}
          </div>
          <InputBar opacity={progress} />
        </div>
        <div style={{ width: "70%" }}>
          <PreviewPanel opacity={progress} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'fintech-ui',
  name: 'Fintech UI',
  duration: 210, // 7 seconds at 30fps
  previewFrame: 30,
  getCode: () => `const {
AbsoluteFill,
interpolate,
useCurrentFrame,
spring,
useVideoConfig,
} = window.Remotion;

const { IconifyIcon } = window;

const ChatMessage = ({ text, isUser, delay }) => {
const frame = useCurrentFrame();
const progress = spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });

return (
  <div
    style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      opacity: progress,
      transform: \`translateY(\${interpolate(progress, [0, 1], [20, 0])}px)\`,
      marginBottom: 24,
    }}
  >
    <div
      style={{
        maxWidth: "80%",
        padding: "16px 20px",
        borderRadius: 20,
        background: isUser ? "#007AFF" : "#E9ECEF",
        color: isUser ? "white" : "#212529",
        fontFamily: "sans-serif",
        fontSize: 16,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  </div>
);
};

const InputBar = ({ opacity }) => {
const frame = useCurrentFrame();
const text = "This dashboard looks perfect for freelancers!";
const charCount = Math.floor(interpolate(frame, [0, 150], [0, text.length], { extrapolateRight: "clamp" }));

return (
  <div
    style={{
      minHeight: 100,
      background: "white",
      borderRadius: 20,
      display: "flex",
      flexDirection: "column",
      padding: 16,
      opacity,
      transform: \`translateY(\${interpolate(opacity, [0, 1], [20, 0])}px)\`,
      boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
      border: "1px solid #E5E5E5",
      position: "relative",
    }}
  >
    <div
      style={{
        flex: 1,
        color: "#212529",
        fontFamily: "sans-serif",
        fontSize: 16,
        lineHeight: 1.5,
        display: "flex",
        alignItems: "flex-start",
        paddingTop: 4,
      }}
    >
      <span>{text.slice(0, charCount)}</span>
    </div>
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 8,
      }}
    >
      <button
        style={{
          background: "#000000",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 14,
          fontWeight: "600",
          cursor: "pointer",
          fontFamily: "sans-serif",
        }}
      >
        Send
      </button>
    </div>
  </div>
);
};

const AnimatedValue = ({ start, end, prefix = "", suffix = "", delay = 0 }) => {
const frame = useCurrentFrame();
const value = Math.floor(interpolate(frame - delay, [0, 60], [start, end], { extrapolateRight: "clamp" }));
return <span style={{ fontWeight: "600", fontFamily: "sans-serif", color: "#1a1a1a" }}>{prefix}{value.toLocaleString()}{suffix}</span>;
};

const ProgressBar = ({ percentage, color, delay = 0 }) => {
const frame = useCurrentFrame();
const progress = interpolate(frame - delay, [0, 60], [0, percentage], { extrapolateRight: "clamp" });

return (
  <div style={{ width: "100%", height: "8px", background: "#F3F4F6", borderRadius: "4px", overflow: "hidden" }}>
    <div style={{
      width: \`\${progress}%\`,
      height: "100%",
      background: color,
      borderRadius: "4px"
    }} />
  </div>
);
};

const MyWalletSection = ({ opacity }) => {
  const frame = useCurrentFrame();
  const anim = (delay) => spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });
  
  const currencies = [
    { code: 'USD', flag: '🇺🇸', amount: '$342.50', limit: 'Limit is $10k a month', status: 'Active', statusColor: '#10B981' },
    { code: 'EUR', flag: '🇩🇪', amount: '€287.30', limit: 'Limit is €8k a month', status: 'Active', statusColor: '#10B981' },
    { code: 'BDT', flag: '🇧🇩', amount: '৳41,890.00', limit: 'Limit is ৳10k a month', status: 'Active', statusColor: '#10B981' },
    { code: 'GBP', flag: '🇬🇧', amount: '£198.75', limit: 'Limit is £7.5k a month', status: 'Inactive', statusColor: '#EF4444' }
  ];
  
  return (
    <div style={{ 
      opacity: anim(45),
      background: "#F9FAFB",
      border: "1px solid #E5E7EB",
      borderRadius: "12px",
      padding: "20px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: "600", margin: 0 }}>My Wallet</h3>
        <button style={{
          background: "white",
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: 14,
          fontWeight: "500",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#374151"
        }}>
          <IconifyIcon icon="mdi:plus" style={{ fontSize: 14 }} />
          Add New
        </button>
      </div>
      <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 20 }}>Today 1 USD = 122.20 BDT</div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {currencies.map((currency, i) => (
          <div key={i} style={{
            background: "white",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            padding: "16px",
            position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{currency.flag}</span>
                <span style={{ fontSize: 16, fontWeight: "600" }}>{currency.code}</span>
              </div>
              <IconifyIcon icon="mdi:dots-vertical" style={{ fontSize: 16, color: "#9CA3AF" }} />
            </div>
            
            <div style={{ fontSize: 24, fontWeight: "700", marginBottom: 4 }}>
              {currency.amount}
            </div>
            
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
              {currency.limit}
            </div>
            
            <div style={{ 
              fontSize: 12, 
              fontWeight: "500",
              color: currency.statusColor
            }}>
              {currency.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SavingsGoalsSection = ({ opacity }) => {
  const frame = useCurrentFrame();
  const anim = (delay) => spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });
  
  return (
    <div style={{ 
      opacity: anim(55),
      background: "#F9FAFB",
      border: "1px solid #E5E7EB",
      borderRadius: "12px",
      padding: "20px"
    }}>
      <h3 style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>Savings Goals</h3>
      
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#4F46E5", display: "flex", alignItems: "center", gap: 6 }}>
            <IconifyIcon icon="mdi:home" style={{ fontSize: 16 }} />
            Dream House
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Target: $75,849.00</div>
          <div style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>$84,857.00</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>72%</div>
          <ProgressBar percentage={72} color="#4F46E5" delay={65} />
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#F59E0B", display: "flex", alignItems: "center", gap: 6 }}>
            <IconifyIcon icon="mdi:school" style={{ fontSize: 16 }} />
            Education
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Target: $65,445.00</div>
          <div style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>$53,949.00</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>84%</div>
          <ProgressBar percentage={84} color="#F59E0B" delay={70} />
        </div>
      </div>
    </div>
  );
};

const PreviewPanel = ({ opacity }) => {
const frame = useCurrentFrame();
const { width, height } = useVideoConfig();
const anim = (delay) => spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });

return (
  <div style={{ 
    flex: 1, 
    background: "white", 
    borderRadius: 16, 
    opacity, 
    position: "relative", 
    overflow: "hidden", 
    padding: 32,
    color: "#1a1a1a", 
    fontFamily: "sans-serif",
    display: "flex",
    flexDirection: "column",
    height: "100%"
  }}>
    {/* Header */}
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      marginBottom: 32,
      opacity: anim(0)
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: "600", margin: 0 }}>Welcome, Jerry</h1>
        <IconifyIcon icon="mdi:fire" style={{ fontSize: 24, color: "#FF6B35" }} />
      </div>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 16,
        fontSize: 16,
        color: "#6B7280"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <IconifyIcon icon="mdi:calendar" style={{ fontSize: 16 }} />
          <span>16 May 2024</span>
        </div>
        <button style={{
          background: "#4F46E5",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: 14,
          fontWeight: "600",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6
        }}>
          <IconifyIcon icon="mdi:export" style={{ fontSize: 14 }} />
          Share
        </button>
      </div>
    </div>

    {/* Top Stats Row with Containers */}
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "1fr 1fr 1fr 1fr", 
      gap: 20, 
      marginBottom: 32,
      opacity: anim(15)
    }}>
      {/* Cash Balance Container */}
      <div style={{
        background: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, color: "#6B7280", margin: 0, fontWeight: "500" }}>Cash Balance</h3>
          <IconifyIcon icon="mdi:information-outline" style={{ fontSize: 16, color: "#9CA3AF" }} />
        </div>
        <div style={{ fontSize: 32, fontWeight: "700", marginBottom: 4 }}>
          $<AnimatedValue start={20000} end={24847} prefix="" suffix="" delay={20} />
        </div>
        <div style={{ fontSize: 14, color: "#10B981", display: "flex", alignItems: "center", gap: 4 }}>
          <IconifyIcon icon="mdi:trending-up" style={{ fontSize: 14 }} />
          16.8%
        </div>
      </div>
      
      {/* Savings Container */}
      <div style={{
        background: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, color: "#6B7280", margin: 0, fontWeight: "500" }}>Total Savings</h3>
          <IconifyIcon icon="mdi:information-outline" style={{ fontSize: 16, color: "#9CA3AF" }} />
        </div>
        <div style={{ fontSize: 32, fontWeight: "700", marginBottom: 4 }}>
          $<AnimatedValue start={85000} end={93845} prefix="" suffix="" delay={25} />
        </div>
        <div style={{ fontSize: 14, color: "#10B981", display: "flex", alignItems: "center", gap: 4 }}>
          <IconifyIcon icon="mdi:trending-up" style={{ fontSize: 14 }} />
          16.8%
        </div>
      </div>
      
      <div style={{
        background: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, color: "#6B7280", margin: 0, fontWeight: "500" }}>Monthly Spent</h3>
          <IconifyIcon icon="mdi:information-outline" style={{ fontSize: 16, color: "#9CA3AF" }} />
        </div>
        <div style={{ fontSize: 32, fontWeight: "700", marginBottom: 4 }}>
          $<AnimatedValue start={40000} end={4562} prefix="" suffix="" delay={30} />
        </div>
        <div style={{ fontSize: 14, color: "#10B981", display: "flex", alignItems: "center", gap: 4 }}>
          <IconifyIcon icon="mdi:trending-up" style={{ fontSize: 14 }} />
          16.5%
        </div>
      </div>
      
      <div style={{
        background: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, color: "#6B7280", margin: 0, fontWeight: "500" }}>Monthly Income</h3>
          <IconifyIcon icon="mdi:information-outline" style={{ fontSize: 16, color: "#9CA3AF" }} />
        </div>
        <div style={{ fontSize: 32, fontWeight: "700", marginBottom: 4 }}>
          $<AnimatedValue start={80000} end={8488} prefix="" suffix="" delay={35} />
        </div>
        <div style={{ fontSize: 14, color: "#EF4444", display: "flex", alignItems: "center", gap: 4 }}>
          <IconifyIcon icon="mdi:trending-down" style={{ fontSize: 14 }} />
          12.8%
        </div>
      </div>
    </div>

    {/* Main Content Grid */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, flex: 1 }}>
      {/* Left Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Recent Activity Section */}
        <div style={{ opacity: anim(40), flex: 1, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>Recent Activity</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            {[
              { name: "PayPal", date: "16 Jul 2024", amount: "+848.84", color: "#003087", icon: "mdi:paypal" },
              { name: "Wise", date: "15 Jul 2024", amount: "-665.56", color: "#00B9FF", icon: "mdi:bank-transfer" },
              { name: "Atlassian", date: "14 Jul 2024", amount: "+546.84", color: "#0052CC", icon: "mdi:atlassian" },
              { name: "Dropbox", date: "13 Jul 2024", amount: "-738.59", color: "#0061FF", icon: "mdi:dropbox" },
              { name: "Spotify", date: "12 Jul 2024", amount: "-15.99", color: "#1DB954", icon: "mdi:spotify" },
              { name: "Amazon", date: "11 Jul 2024", amount: "-234.67", color: "#FF9900", icon: "mdi:amazon" },
              { name: "Netflix", date: "10 Jul 2024", amount: "-12.99", color: "#E50914", icon: "mdi:netflix" },
              { name: "Uber", date: "09 Jul 2024", amount: "-28.45", color: "#000000", icon: "mdi:car" },
              { name: "Starbucks", date: "08 Jul 2024", amount: "-6.75", color: "#00704A", icon: "mdi:coffee" },
              { name: "Apple", date: "07 Jul 2024", amount: "-99.99", color: "#007AFF", icon: "mdi:apple" }
            ].map((item, i) => (
              <div key={i} style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "12px 16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: item.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white"
                  }}>
                    <IconifyIcon icon={item.icon} style={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: "500" }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>{item.date}</div>
                  </div>
                </div>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: "600",
                  color: item.amount.startsWith("+") ? "#10B981" : "#EF4444"
                }}>
                  {item.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Right Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* My Wallet Section */}
        <MyWalletSection opacity={anim(45)} />
        
        {/* Savings Goals */}
        <SavingsGoalsSection opacity={anim(55)} />
      </div>
    </div>
  </div>
);
};

export default function FintechUI() {
const frame = useCurrentFrame();
const progress = spring({ frame, fps: 30, config: { damping: 20, stiffness: 80 } });
const messages = [
  { text: "I need a finance dashboard for my freelance business.", isUser: true, delay: 0 },
  { text: "Perfect! What features would help you manage your freelance finances?", isUser: false, delay: 15 },
  { text: "Income tracking, expense monitoring, savings goals, and client payment history.", isUser: true, delay: 30 },
  { text: "Great! Here's a freelancer-focused finance dashboard with all those features.", isUser: false, delay: 45 },
  { text: "This is exactly what I need! The multi-currency support is perfect for international clients.", isUser: true, delay: 60 },
  { text: "Should we add project-based budgeting and tax preparation features?", isUser: false, delay: 75 },
  { text: "Yes! And maybe quarterly earnings reports for tax filing.", isUser: true, delay: 90 },
  { text: "Excellent idea! I'll add those freelancer-specific financial tools.", isUser: false, delay: 105 },
];

return (
  <AbsoluteFill style={{ background: "#F8F9FA" }}>
    <div style={{ display: "flex", height: "100%", padding: 32, gap: 32 }}>
      <div style={{ width: "30%", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 20 }}>
          {messages.map((msg, i) => <ChatMessage key={i} {...msg} />)}
        </div>
        <InputBar opacity={progress} />
      </div>
      <div style={{ width: "70%" }}>
        <PreviewPanel opacity={progress} />
      </div>
    </div>
  </AbsoluteFill>
);
}

export const durationInFrames_fintech = 210;`
};
