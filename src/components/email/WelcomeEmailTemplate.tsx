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
} from '@react-email/components';

interface WelcomeEmailProps {
  firstName?: string;
}

export default function WelcomeEmailTemplate({ firstName = 'there' }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Bazaar-Vid - Create stunning videos with AI</Preview>
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

          <Section style={content}>
            <Heading style={h1}>Welcome to Bazaar-Vid, {firstName}! 🎬</Heading>
            
            <Text style={text}>
              We're thrilled to have you join our community of creators! Bazaar-Vid makes it incredibly easy to create professional videos using the power of AI.
            </Text>

            <Section style={featuresSection}>
              <Text style={featuresTitle}>Here's what you can do:</Text>
              
              <Text style={feature}>
                🎨 <strong>AI-Powered Scene Generation</strong><br />
                Describe your vision and watch our AI create stunning video scenes
              </Text>
              
              <Text style={feature}>
                ⚡ <strong>Real-time Editing</strong><br />
                Make changes instantly with our intelligent editing system
              </Text>
              
              <Text style={feature}>
                🎭 <strong>Custom Animations</strong><br />
                Add professional animations and effects with simple prompts
              </Text>
              
              <Text style={feature}>
                📱 <strong>Export & Share</strong><br />
                Export your videos in high quality and share them anywhere
              </Text>
            </Section>

            <Section style={ctaSection}>
              <Button
                href="https://bazaar-vid.vercel.app/projects"
                style={button}
              >
                Start Creating Your First Video
              </Button>
            </Section>

            <Text style={text}>
              Need help getting started? Check out our <Link href="https://bazaar-vid.vercel.app/docs" style={link}>documentation</Link> or reply to this email - we're here to help!
            </Text>

            <Text style={footer}>
              Best regards,<br />
              The Bazaar-Vid Team
            </Text>
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
};

const logoSection = {
  padding: '32px 32px 0',
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '0 32px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '32px 0 16px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const featuresSection = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
};

const featuresTitle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const feature = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '12px 0',
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

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '32px 0 0',
}; 