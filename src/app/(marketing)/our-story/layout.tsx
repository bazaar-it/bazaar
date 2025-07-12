import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Story | Bazaar',
  description: 'The story behind Bazaar - how Jack and Markus built an AI-powered video generation tool',
};

export default function OurStoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 