import Link from "next/link";
import { Youtube, Instagram, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white/95 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              Neural Hub Limited © {new Date().getFullYear()} All rights reserved
            </span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <Link 
              href="/our-story" 
              className="hover:text-gray-900 transition-colors"
            >
              Our Story
            </Link>
            <Link 
              href="/privacy" 
              className="hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              className="hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </Link>

            <a 
              href="mailto:jack@bazaar.it" 
              className="hover:text-gray-900 transition-colors"
            >
              Contact
            </a>
            {/* Social links */}
            <div className="hidden md:inline-block h-5 w-px bg-gray-300" aria-hidden="true" />
            <div className="flex items-center space-x-4">
              <a
                href="https://www.youtube.com/@MadebyBazaar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/bazaar___it?s=11"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title="X (Twitter)"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/bazaar.it.gram/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
