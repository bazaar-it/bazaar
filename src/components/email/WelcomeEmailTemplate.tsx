import * as React from 'react';

interface WelcomeEmailTemplateProps {
  firstName: string;
  userEmail: string;
}

export function WelcomeEmailTemplate({ firstName, userEmail }: WelcomeEmailTemplateProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.6, color: '#333' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#3B82F6', fontSize: '28px', marginBottom: '10px' }}>
            Welcome to Bazaar-Vid! 🎉
          </h1>
        </div>
        
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h2 style={{ color: '#1F2937', fontSize: '20px', marginBottom: '15px' }}>
            Hi {firstName}!
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '15px' }}>
            We're excited to have you join the Bazaar-Vid community! Your account has been successfully created.
          </p>
          <p style={{ fontSize: '16px', marginBottom: '15px' }}>
            With Bazaar-Vid, you can create stunning motion graphics and animations with the power of AI. 
            Start by creating your first project and let our AI help you bring your ideas to life.
          </p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#1F2937', fontSize: '18px', marginBottom: '15px' }}>
            What you can do with Bazaar-Vid:
          </h3>
          <ul style={{ fontSize: '16px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Create animated scenes with AI assistance</li>
            <li style={{ marginBottom: '8px' }}>Upload images for AI-powered scene generation</li>
            <li style={{ marginBottom: '8px' }}>Use professional templates to get started quickly</li>
            <li style={{ marginBottom: '8px' }}>Export high-quality video content</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <a 
            href="https://bazaar-vid.vercel.app/projects" 
            style={{
              backgroundColor: '#3B82F6',
              color: 'white',
              padding: '12px 24px',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'inline-block'
            }}
          >
            Start Creating Now
          </a>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', fontSize: '14px', color: '#6b7280' }}>
          <p>
            If you have any questions, feel free to reach out to our support team. We're here to help!
          </p>
          <p style={{ marginTop: '15px' }}>
            Best regards,<br />
            The Bazaar-Vid Team
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px', color: '#9ca3af' }}>
          <p>
            This email was sent to {userEmail}. If you didn't create an account with Bazaar-Vid, 
            you can safely ignore this email.
          </p>
        </div>
      </div>
    </div>
  );
} 