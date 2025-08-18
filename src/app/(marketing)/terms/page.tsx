"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[15px] shadow-lg border border-gray-100 p-8 relative">
          {/* Header with Logo */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Bazaar</span>
            </Link>
            
            {/* Close Button */}
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h1 className="text-3xl font-bold mb-8 text-gray-900">Terms of Service</h1>
          <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By accessing and using Bazaar-Vid ("the Service"), you accept and agree to be bound by the terms and 
                provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                Bazaar-Vid is an AI-powered video generation platform that allows users to create videos through text 
                prompts and scene-based editing. The Service includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>AI-powered video scene generation</li>
                <li>Video editing and customization tools</li>
                <li>Project management and storage</li>
                <li>Video rendering and export capabilities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. User Accounts</h2>
              <p className="text-gray-700 mb-4">
                You must create an account to use our Service. You may sign up using Google OAuth or GitHub OAuth. 
                You are responsible for maintaining the confidentiality of your account.
              </p>
              <p className="text-gray-700">
                You are responsible for all activities that occur under your account. You must notify us immediately of any 
                unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. Acceptable Use</h2>
              <p className="text-gray-700 mb-4">You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Create content that is illegal, harmful, or violates any laws</li>
                <li>Generate content that infringes on intellectual property rights</li>
                <li>Create content that is defamatory, obscene, or offensive</li>
                <li>Attempt to reverse engineer or hack the Service</li>
                <li>Use the Service for commercial purposes without authorization</li>
                <li>Share your account credentials with others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Content Ownership and License</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-800">Your Content</h3>
                  <p className="text-gray-700">
                    You retain ownership of the content you create using our Service. However, by using Bazaar-Vid, 
                    you grant us a worldwide, non-exclusive, royalty-free, perpetual, and irrevocable license to:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                    <li>Store, process, and display your content as necessary to provide the Service</li>
                    <li>Use your content for marketing, promotional, and advertising purposes for Bazaar-Vid</li>
                    <li>Feature your content in our galleries, showcases, and social media channels</li>
                    <li>Include your content in case studies, demonstrations, and promotional materials</li>
                    <li>Display your content on our website, marketing materials, and partner platforms</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-800">Promotional Use Rights</h3>
                  <p className="text-gray-700">
                    By creating content with Bazaar-Vid, you acknowledge and agree that we may use any videos, 
                    scenes, or creative works you generate through our platform for promotional purposes. This includes 
                    but is not limited to showcasing your work as examples of what can be created with Bazaar-Vid, 
                    featuring it in our marketing campaigns, and sharing it across our communication channels. 
                    We will make reasonable efforts to attribute content when practical, though attribution is not required.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-800">Generated Content</h3>
                  <p className="text-gray-700">
                    Content generated by our AI systems is provided "as is" and you are responsible for ensuring 
                    it complies with applicable laws and does not infringe on third-party rights. You acknowledge 
                    that AI-generated content may be similar to content created by other users due to the nature 
                    of AI systems.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-800">Opt-Out</h3>
                  <p className="text-gray-700">
                    If you do not wish for your content to be used for promotional purposes, you may contact us at 
                    jack@bazaar.it with specific content you'd like excluded. Note that this may limit certain 
                    features or community aspects of the Service.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Service Availability</h2>
              <p className="text-gray-700">
                We strive to maintain high availability but do not guarantee uninterrupted access to the Service. 
                We may temporarily suspend the Service for maintenance, updates, or other operational reasons.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Limitation of Liability</h2>
              <p className="text-gray-700">
                The Service is provided "as is" without warranties of any kind. We shall not be liable for any 
                indirect, incidental, special, or consequential damages arising from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Privacy</h2>
              <p className="text-gray-700">
                Your privacy is important to us. Please review our{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                {" "}to understand how we collect, use, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. Termination</h2>
              <p className="text-gray-700">
                We may terminate or suspend your account at any time for violations of these terms. 
                You may also delete your account at any time through your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">10. Changes to Terms</h2>
              <p className="text-gray-700">
                We reserve the right to modify these terms at any time. We will notify you of any 
                changes by posting the updated terms on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">11. Contact Information</h2>
              <p className="text-gray-700">
                If you have any questions about these Terms of Service, please contact us at{" "}
                <a href="mailto:jack@bazaar.it" className="text-blue-600 hover:underline">
                  jack@bazaar.it
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 