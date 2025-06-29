import * as React from 'react';

interface NewsletterEmailTemplateProps {
  firstName: string;
  userEmail: string;
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
}

export function NewsletterEmailTemplate({ 
  firstName, 
  userEmail, 
  subject, 
  content, 
  ctaText, 
  ctaUrl 
}: NewsletterEmailTemplateProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.6, color: '#333' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #3B82F6', paddingBottom: '20px' }}>
          <h1 style={{ color: '#3B82F6', fontSize: '24px', marginBottom: '5px' }}>
            Bazaar-Vid Newsletter
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0' }}>
            Latest updates and features
          </p>
        </div>
        
        {/* Greeting */}
        <div style={{ marginBottom: '25px' }}>
          <h2 style={{ color: '#1F2937', fontSize: '22px', marginBottom: '15px' }}>
            {subject}
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '15px' }}>
            Hi {firstName},
          </p>
        </div>

        {/* Main Content */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '25px', 
          borderRadius: '8px', 
          marginBottom: '25px',
          border: '1px solid #e5e7eb'
        }}>
          <div 
            style={{ fontSize: '16px', lineHeight: '1.6' }}
            dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
          />
        </div>

        {/* Call to Action */}
        {ctaText && ctaUrl && (
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <a 
              href={ctaUrl}
              style={{
                backgroundColor: '#3B82F6',
                color: 'white',
                padding: '14px 28px',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'inline-block',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
              }}
            >
              {ctaText}
            </a>
          </div>
        )}

        {/* Feature Highlights */}
        <div style={{ 
          backgroundColor: '#eff6ff', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '25px',
          border: '1px solid #bfdbfe'
        }}>
          <h3 style={{ color: '#1e40af', fontSize: '18px', marginBottom: '15px', textAlign: 'center' }}>
            🚀 What's New in Bazaar-Vid
          </h3>
          <ul style={{ fontSize: '14px', paddingLeft: '20px', margin: '0' }}>
            <li style={{ marginBottom: '8px' }}>Enhanced AI scene generation</li>
            <li style={{ marginBottom: '8px' }}>New professional templates</li>
            <li style={{ marginBottom: '8px' }}>Improved video export quality</li>
            <li style={{ marginBottom: '8px' }}>Better user experience</li>
          </ul>
        </div>

        {/* Social Links */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <p style={{ fontSize: '16px', marginBottom: '15px', color: '#4b5563' }}>
            Stay connected with us:
          </p>
          <div style={{ display: 'inline-block' }}>
            <a 
              href="#" 
              style={{ 
                color: '#3B82F6', 
                textDecoration: 'none', 
                margin: '0 10px',
                fontSize: '14px'
              }}
            >
              Twitter
            </a>
            <a 
              href="#" 
              style={{ 
                color: '#3B82F6', 
                textDecoration: 'none', 
                margin: '0 10px',
                fontSize: '14px'
              }}
            >
              LinkedIn
            </a>
            <a 
              href="#" 
              style={{ 
                color: '#3B82F6', 
                textDecoration: 'none', 
                margin: '0 10px',
                fontSize: '14px'
              }}
            >
              GitHub
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          borderTop: '1px solid #e5e7eb', 
          paddingTop: '20px', 
          fontSize: '14px', 
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <p style={{ marginBottom: '10px' }}>
            Thanks for being part of the Bazaar-Vid community!
          </p>
          <p style={{ marginBottom: '15px' }}>
            Best regards,<br />
            The Bazaar-Vid Team
          </p>
        </div>

        {/* Unsubscribe */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#9ca3af' }}>
          <p>
            This email was sent to {userEmail}.
          </p>
          <p style={{ marginTop: '5px' }}>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'underline' }}>
              Unsubscribe
            </a> | 
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'underline', marginLeft: '5px' }}>
              Update Preferences
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 