import Link from "next/link";

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
          </div>
        </div>
      </div>
    </footer>
  );
} 