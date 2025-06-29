import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface NewsletterEmailProps {
  firstName?: string;
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
}

export default function NewsletterEmailTemplate({ 
  firstName = 'there', 
  subject,
  content,
  ctaText,
  ctaUrl 
}: NewsletterEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src="https://bazaar-vid.vercel.app/bazaar-logo.png"
              width="120"
              height="40"
              alt="Bazaar-Vid"
              style={logo}
            />
          </Section>

          <Section style={contentSection}>
            <Heading style={h1}>{subject}</Heading>
            
            <Text style={greeting}>Hi {firstName},</Text>
            
            <div style={contentBody} dangerouslySetInnerHTML={{ __html: content }} />

            {ctaText && ctaUrl && (
              <Section style={ctaSection}>
                <Button href={ctaUrl} style={button}>
                  {ctaText}
                </Button>
              </Section>
            )}

            <Hr style={hr} />

            <Section style={footerSection}>
              <Text style={footerText}>
                Best regards,<br />
                The Bazaar-Vid Team
              </Text>
              
              <Text style={socialText}>
                Follow us on social media:
              </Text>
              
              <Section style={socialLinks}>
                <Link href="https://twitter.com/bazaarvid" style={socialLink}>
                  Twitter
                </Link>
                <Text style={separator}>•</Text>
                <Link href="https://github.com/bazaarvid" style={socialLink}>
                  GitHub
                </Link>
                <Text style={separator}>•</Text>
                <Link href="https://bazaar-vid.vercel.app" style={socialLink}>
                  Website
                </Link>
              </Section>

              <Text style={unsubscribeText}>
                You're receiving this email because you signed up for Bazaar-Vid updates.<br />
                <Link href="https://bazaar-vid.vercel.app/unsubscribe" style={unsubscribeLink}>
                  Unsubscribe from these emails
                </Link>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const logoSection = {
  padding: '32px 32px 0',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const contentSection = {
  padding: '0 32px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '32px 0 16px',
};

const greeting = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const contentBody = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '24px 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '0 auto',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footerSection = {
  marginTop: '32px',
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
};

const socialText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 8px',
};

const socialLinks = {
  textAlign: 'center' as const,
  margin: '8px 0 24px',
};

const socialLink = {
  color: '#3b82f6',
  fontSize: '14px',
  textDecoration: 'underline',
  margin: '0 8px',
};

const separator = {
  color: '#9ca3af',
  fontSize: '14px',
  margin: '0 4px',
  display: 'inline',
};

const unsubscribeText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '24px 0 0',
};

const unsubscribeLink = {
  color: '#9ca3af',
  textDecoration: 'underline',
}; 