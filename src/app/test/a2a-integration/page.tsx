//src/app/test/a2a-integration/page.tsx

import { A2AIntegrationTest } from '~/client/components/test-harness/A2AIntegrationTest';

export const metadata = {
  title: 'A2A Integration Tests',
  description: 'Testing harness for A2A frontend integration components',
};

/**
 * Test page for A2A frontend integration testing
 * 
 * This page provides a UI to test the A2A frontend components with the actual backend.
 */
export default function A2AIntegrationTestPage() {
  return <A2AIntegrationTest />;
}
