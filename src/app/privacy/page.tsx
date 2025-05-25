import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Bazaar-Vid",
  description: "Privacy Policy for Bazaar-Vid AI Video Generation Platform",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50/30 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/95 rounded-[15px] shadow-lg border border-gray-100 p-8">
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Account Information</h3>
                  <p className="text-gray-700">
                    When you create an account, we collect your email address, name, and profile information 
                    from your chosen authentication provider (Google or GitHub).
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Project Data</h3>
                  <p className="text-gray-700">
                    We store the video projects you create, including prompts, generated scenes, and project metadata.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Usage Analytics</h3>
                  <p className="text-gray-700">
                    We collect anonymous usage data to improve our service, including page views, feature usage, 
                    and performance metrics.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>To provide and maintain our video generation service</li>
                <li>To authenticate your account and ensure security</li>
                <li>To store and manage your video projects</li>
                <li>To improve our service through analytics</li>
                <li>To communicate with you about service updates</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Data Storage and Security</h2>
              <p className="text-gray-700 mb-4">
                Your data is stored securely using industry-standard encryption. We use:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Encrypted database connections</li>
                <li>Secure cloud storage for generated videos</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Authentication</h3>
                  <p className="text-gray-700">
                    We use Google OAuth and GitHub OAuth for secure authentication. These services may 
                    collect additional data according to their own privacy policies.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Analytics</h3>
                  <p className="text-gray-700">
                    We use Google Analytics and Vercel Analytics to understand how our service is used. 
                    This data is anonymized and aggregated.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">AI Services</h3>
                  <p className="text-gray-700">
                    We use OpenAI's services to generate video content. Your prompts may be processed 
                    by these services according to their privacy policies.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Export your project data</li>
                <li>Opt out of analytics tracking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
              <p className="text-gray-700">
                We retain your data for as long as your account is active. When you delete your account, 
                we will delete your personal data within 30 days, except where required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Children's Privacy</h2>
              <p className="text-gray-700">
                Our service is not intended for children under 13. We do not knowingly collect 
                personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this privacy policy from time to time. We will notify you of any 
                changes by posting the new policy on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:privacy@bazaar.it" className="text-blue-600 hover:underline">
                  privacy@bazaar.it
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 