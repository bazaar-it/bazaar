// src/templates/AIDialogue.tsx
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} from 'remotion';

const messages = [
  { text: "Hey, I want to generate a motion graphic video for my product.", isUser: true, delay: 0 },
  { text: "Awesome! What kind of visuals or layout are you thinking?", isUser: false, delay: 10 },
  { text: "Let's go for a product demo vibe. Bold headline, clean interface.", isUser: true, delay: 20 },
  { text: "Got it. Should I include animated metrics and a button CTA?", isUser: false, delay: 30 },
  { text: "Yes, with green numbers for growth and a glowing effect on CTA.", isUser: true, delay: 40 },
  { text: "Done. Preview now includes everything and looks polished.", isUser: false, delay: 50 },
  { text: "Perfect. This is exactly what I envisioned using Bazaar.", isUser: true, delay: 60 },
  { text: "Thanks, this is exactly what I needed! Let's export", isUser: false, delay: 70 },
];

const ChatMessage = ({ text, isUser, delay }: { text: string; isUser: boolean; delay: number }) => {
  const frame = useCurrentFrame();
  const opacity = spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 12, stiffness: 200 },
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        padding: '12px 24px',
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          fontSize: 16,
          fontFamily: 'sans-serif',
          background: isUser ? '#007AFF' : '#F1F1F1',
          color: isUser ? 'white' : '#111',
          padding: '16px 20px',
          borderRadius: 24,
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default function AIDialogue() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#F8F9FA',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 0 80px 0',
        justifyContent: 'flex-start',
      }}
    >
      {messages.map((msg, i) => (
        <ChatMessage key={i} {...msg} />
      ))}
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'ai-dialogue',
  name: 'AI Dialogue',
  duration: 180, // 6 seconds
  previewFrame: 30,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, interpolate, spring } = window.Remotion;
  const messages = [
    { text: "Hey, I want to generate a motion graphic video for my product.", isUser: true, delay: 0 },
    { text: "Awesome! What kind of visuals or layout are you thinking?", isUser: false, delay: 10 },
    { text: "Let's go for a product demo vibe. Bold headline, clean interface.", isUser: true, delay: 20 },
    { text: "Got it. Should I include animated metrics and a button CTA?", isUser: false, delay: 30 },
    { text: "Yes, with green numbers for growth and a glowing effect on CTA.", isUser: true, delay: 40 },
    { text: "Done. Preview now includes everything and looks polished.", isUser: false, delay: 50 },
    { text: "Perfect. This is exactly what I envisioned using Bazaar.", isUser: true, delay: 60 },
    { text: "Thanks, this is exactly what I needed! Let's export", isUser: false, delay: 70 },
  ];
  
  const ChatMessage = ({ text, isUser, delay }) => {
    const frame = useCurrentFrame();
    const opacity = spring({
      frame: frame - delay,
      fps: 30,
      config: { damping: 12, stiffness: 200 },
    });
  
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          padding: '12px 24px',
          opacity,
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            fontSize: 16,
            fontFamily: 'sans-serif',
            background: isUser ? '#007AFF' : '#F1F1F1',
            color: isUser ? 'white' : '#111',
            padding: '16px 20px',
            borderRadius: 24,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          {text}
        </div>
      </div>
    );
  };
  
  export default function AIDialogue() {
    const frame = useCurrentFrame();
  
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#F8F9FA',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 0 80px 0',
          justifyContent: 'flex-start',
        }}
      >
        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}
             </AbsoluteFill>
     );
   }`
}; 