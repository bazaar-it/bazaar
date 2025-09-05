// src/components/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export default function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const pathname = usePathname();

  // Determine if we're in a specific section based on the pathname
  const currentSection = pathname === '/admin' ? (activeSection || 'homepage') :
    pathname === '/admin/users' ? 'users' :
    pathname === '/admin/analytics' ? 'analytics' :
    pathname === '/admin/exports' ? 'exports' :
    pathname === '/admin/testing' ? 'testing' :
    pathname === '/admin/email-marketing' ? 'email-marketing' :
    pathname === '/admin/marketing' ? 'marketing' :
    pathname === '/admin/marketing/enhanced' ? 'marketing-enhanced' :
    pathname === '/admin/chat-export' ? 'chat-export' :
    pathname === '/admin/promo-codes' ? 'promo-codes' :
    pathname === '/admin/paywall-analytics' ? 'paywall-analytics' :
    pathname === '/admin/evals' ? 'evals' :
    pathname === '/admin/live' ? 'live' :
    pathname === '/admin/error-analytics' ? 'error-analytics' :
    pathname === '/admin/brand-extraction' ? 'brand-extraction' :
    pathname === '/admin/project-search' ? 'project-search' :
    pathname === '/admin/prompt-ab-testing' ? 'prompt-ab-testing' : 'homepage';

  return (
    <div className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl min-h-screen">
      <div className="p-6">
        <Link href="/admin" className="group flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-200">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">Admin Panel</h2>
            <p className="text-xs text-gray-400">Bazaar Control Center</p>
          </div>
        </Link>
        <nav className="mt-10">
          <div className="space-y-1">
            {/* Dashboard Overview - always visible */}
            <Link
              href="/admin"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'homepage'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span className="font-medium">Dashboard Overview</span>
            </Link>

            {/* User Management */}
            <Link 
              href="/admin/users"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'users'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13.5 10.5V6.75a2.25 2.25 0 10-4.5 0v3.75m1.5 0h3a1.5 1.5 0 011.5 1.5v.75m-4.5-2.25h3m-3 0a1.5 1.5 0 00-1.5 1.5v.75m1.5-2.25a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5v2.25" />
              </svg>
              <span className="font-medium">User Management</span>
            </Link>

            {/* Project Search */}
            <Link 
              href="/admin/project-search"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'project-search'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="font-medium">Project Search</span>
            </Link>

            {/* Analytics */}
            <Link 
              href="/admin/analytics"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'analytics'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </Link>

            {/* Live Stream */}
            <Link 
              href="/admin/live"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'live'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2H4z" />
              </svg>
              Live Stream
            </Link>

            {/* Brand Extraction */}
            <Link 
              href="/admin/brand-extraction"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'brand-extraction'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="font-medium">Brand Extraction</span>
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500 text-black rounded-full">NEW</span>
            </Link>

            {/* Marketing Dashboard */}
            <Link 
              href="/admin/marketing"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'marketing'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Marketing
            </Link>

            {/* Enhanced Marketing */}
            <Link 
              href="/admin/marketing/enhanced"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'marketing-enhanced'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Marketing Pro
            </Link>

            {/* Email Marketing */}
            <Link 
              href="/admin/email-marketing"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'email-marketing'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z" />
              </svg>
              Email Campaigns
            </Link>

            {/* Chat Export */}
            <Link 
              href="/admin/chat-export"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'chat-export'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat Export
            </Link>

            {/* Exports */}
            <Link 
              href="/admin/exports"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'exports'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Exports
            </Link>

            {/* Promo Codes */}
            <Link 
              href="/admin/promo-codes"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'promo-codes'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Promo Codes
            </Link>

            {/* Paywall Analytics */}
            <Link 
              href="/admin/paywall-analytics"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'paywall-analytics'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Paywall Analytics
            </Link>

            {/* Evals */}
            <Link 
              href="/admin/evals"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'evals'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Evaluations
            </Link>

            {/* Error Analytics */}
            <Link 
              href="/admin/error-analytics"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'error-analytics'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Error Analytics
            </Link>

            {/* Prompt A/B Testing */}
            <Link 
              href="/admin/prompt-ab-testing"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg w-full text-left transition-all duration-200 ${
                currentSection === 'prompt-ab-testing'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Prompt A/B Testing
            </Link>

            {/* Coming Soon section */}
            <div className="pt-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Coming Soon
              </p>
              <div className="space-y-1">
                {/* AI Testing - moved to Coming Soon */}
                <div className="flex items-center px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Testing
                </div>
                
                <div className="flex items-center px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sales
                </div>
                <div className="flex items-center px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m13 0h-6m-5-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  API Usage
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
