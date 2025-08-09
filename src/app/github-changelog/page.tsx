'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  GitBranch, 
  Video, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Star,
  TrendingUp,
  Clock,
  Code,
  Sparkles
} from 'lucide-react';

export default function GitHubChangelogPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          {/* Navigation */}
          <nav className="flex justify-between items-center mb-20">
            <Link href="/" className="text-2xl font-bold">
              Bazaar
            </Link>
            <div className="flex gap-6">
              <Link href="/docs" className="hover:text-purple-400 transition">
                Documentation
              </Link>
              <a 
                href="https://github.com/apps/bazaar-changelog" 
                className="hover:text-purple-400 transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                Install App
              </a>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-2 mb-8"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-400">GitHub App Now Available</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold mb-6"
            >
              Your Changelog,
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Now in Motion
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto"
            >
              Automatically generate beautiful motion graphic videos from your GitHub PRs. 
              Every merge becomes a shareable video that proves you're shipping fast.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a
                href="https://github.com/apps/bazaar-changelog"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-lg font-semibold transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitBranch className="w-5 h-5" />
                Install GitHub App
                <ArrowRight className="w-4 h-4" />
              </a>
              <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-4 rounded-lg font-semibold transition">
                <Video className="w-5 h-5" />
                Watch Demo
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-400 text-lg">Three steps to beautiful changelogs</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <GitBranch className="w-8 h-8" />,
              title: "1. Merge Your PR",
              description: "Work as usual. When you merge a PR, our GitHub App detects it automatically."
            },
            {
              icon: <Zap className="w-8 h-8" />,
              title: "2. Video Generated",
              description: "Within 2 minutes, we analyze your changes and create a branded motion graphic."
            },
            {
              icon: <Video className="w-8 h-8" />,
              title: "3. Share Anywhere",
              description: "Get a video link, embed code, and social media ready formats instantly."
            }
          ].map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition"
            >
              <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mb-6 text-purple-400">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-gray-400">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-8">
              Changelogs That 
              <span className="text-purple-400"> Get Noticed</span>
            </h2>
            
            <div className="space-y-6">
              {[
                {
                  icon: <CheckCircle className="w-5 h-5 text-green-400" />,
                  title: "Automatic Brand Detection",
                  description: "Reads your repo's colors, logo, and style to create on-brand videos"
                },
                {
                  icon: <CheckCircle className="w-5 h-5 text-green-400" />,
                  title: "Smart Content Analysis",
                  description: "AI understands your changes and creates appropriate visualizations"
                },
                {
                  icon: <CheckCircle className="w-5 h-5 text-green-400" />,
                  title: "Multiple Formats",
                  description: "Export as MP4, GIF, or embed directly in your README"
                },
                {
                  icon: <CheckCircle className="w-5 h-5 text-green-400" />,
                  title: "Zero Configuration",
                  description: "Works out of the box, customizable when you need it"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex gap-4"
                >
                  {feature.icon}
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Video Preview Mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl" />
            <div className="relative bg-black border border-white/20 rounded-xl p-8 space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
              
              <div className="space-y-4">
                <div className="bg-purple-500/20 rounded p-3 flex items-center gap-3">
                  <span className="text-2xl">✨</span>
                  <div>
                    <div className="text-sm text-purple-400">NEW FEATURE</div>
                    <div className="font-semibold">Added Dark Mode Support</div>
                  </div>
                </div>
                
                <div className="bg-green-500/20 rounded p-3 flex items-center gap-3">
                  <span className="text-2xl">🐛</span>
                  <div>
                    <div className="text-sm text-green-400">BUG FIX</div>
                    <div className="font-semibold">Fixed Memory Leak in Chat</div>
                  </div>
                </div>
                
                <div className="bg-blue-500/20 rounded p-3 flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <div className="text-sm text-blue-400">PERFORMANCE</div>
                    <div className="font-semibold">50% Faster Video Generation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { icon: <Clock className="w-6 h-6" />, value: "< 2min", label: "Generation Time" },
            { icon: <TrendingUp className="w-6 h-6" />, value: "10x", label: "More Engagement" },
            { icon: <Code className="w-6 h-6" />, value: "0", label: "Config Required" },
            { icon: <Star className="w-6 h-6" />, value: "100%", label: "Automated" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-lg text-purple-400 mb-4">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold mb-2">{stat.value}</div>
              <div className="text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Configuration Example */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple Configuration</h2>
          <p className="text-gray-400 text-lg">Optional customization when you need it</p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Code className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400">.github/bazaar.json</span>
            </div>
            <pre className="text-sm overflow-x-auto">
              <code className="language-json">{`{
  "changelog": {
    "enabled": true,
    "triggers": ["merge", "release"],
    "style": "branded",
    "videoFormat": "landscape",
    "autoDeploy": true,
    "deployTo": "https://yoursite.com/changelog"
  },
  "brand": {
    "logo": "./assets/logo.svg",
    "primaryColor": "#8B5CF6",
    "font": "Inter"
  }
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Ship with Style?</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Join forward-thinking teams who are making their changelogs impossible to ignore.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/apps/bazaar-changelog"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-lg font-semibold transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitBranch className="w-5 h-5" />
              Install Free GitHub App
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/docs/github-changelog"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-4 rounded-lg font-semibold transition"
            >
              Read Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400">
            © 2024 Bazaar. Ship with style.
          </div>
          <div className="flex gap-6">
            <a href="https://github.com/bazaar-video" className="text-gray-400 hover:text-white transition">
              GitHub
            </a>
            <a href="https://twitter.com/bazaarvideo" className="text-gray-400 hover:text-white transition">
              Twitter
            </a>
            <Link href="/privacy" className="text-gray-400 hover:text-white transition">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}