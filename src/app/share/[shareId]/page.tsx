//src/app/share/[shareId]/page.tsx
"use server";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, User, Eye, Share2, Copy, ExternalLink } from "lucide-react";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { type Metadata } from "next";
import { getBazaarUrl, getShareUrl } from "~/lib/utils";
import ShareVideoPlayerClient from "./ShareVideoPlayerClient";

interface PageProps {
  params: {
    shareId: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const video = await api.share.getSharedVideo({ shareId: params.shareId });

    return {
      title: `${video.title || "Shared Video"} - Bazaar`,
      description: video.description || "An amazing video created with Bazaar",
      openGraph: {
        type: "video.other",
        title: video.title || "Shared Video",
        description: video.description || "An amazing video created with Bazaar",
        url: getShareUrl(params.shareId),
        images: video.thumbnailUrl ? [video.thumbnailUrl] : [],
        videos: video.videoUrl ? [video.videoUrl] : [],
      },
      twitter: {
        card: "player",
        title: video.title || "Shared Video",
        description: video.description || "An amazing video created with Bazaar",
        images: video.thumbnailUrl ? [video.thumbnailUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: "Video Not Found - Bazaar",
      description: "This shared video could not be found.",
    };
  }
}

export default async function SharePage({ params }: PageProps) {
  let share;
  
  try {
    share = await api.share.getSharedVideo({ shareId: params.shareId });
  } catch (error) {
    notFound();
  }

  const shareUrl = getShareUrl(params.shareId);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long", 
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href={getBazaarUrl()} className="text-2xl font-bold text-white">
              Bazaar
            </Link>
            <div className="flex items-center gap-4">
              <Link href={getBazaarUrl()}>
                <Button className="bg-white text-purple-900 hover:bg-gray-100">
                  Try Bazaar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Video Section */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          {/* Video Player */}
          {share.latestScene ? (
            <ShareVideoPlayerClient sceneData={{ tsxCode: share.latestScene.tsxCode, duration: share.latestScene.duration }} />
          ) : (
            <div className="aspect-video bg-gray-800 flex items-center justify-center rounded-lg">
              <div className="text-center text-white/60">
                <p className="text-lg">No content available</p>
                <p className="text-sm mt-1">This video hasn't been created yet</p>
              </div>
            </div>
          )}
          
          {/* Video Info */}
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-3">
              {share.title || "Untitled Video"}
            </h1>
            
            {share.description && (
              <p className="text-gray-300 text-lg mb-4 leading-relaxed">
                {share.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
              {share.creator?.name && (
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span>Created by {share.creator.name}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{formatDate(share.createdAt)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Eye size={16} />
                <span>{share.viewCount} {share.viewCount === 1 ? 'view' : 'views'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-4">
              ✨ Made with Bazaar
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Create your own AI-powered videos in minutes. Transform your ideas into 
              stunning visuals with the power of artificial intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={getBazaarUrl()}>
                <Button size="lg" className="bg-white text-purple-900 hover:bg-gray-100 px-8 py-3 text-lg font-semibold">
                  Start Creating Free
                </Button>
              </Link>
              <Link href={getBazaarUrl("/examples")}>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white hover:text-purple-900 px-8 py-3 text-lg font-semibold"
                >
                  See More Examples
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 Bazaar. Turn ideas into videos with AI.</p>
            <div className="mt-4 flex justify-center gap-6">
              <Link href={getBazaarUrl("/privacy")} className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href={getBazaarUrl("/terms")} className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href={getBazaarUrl("/contact")} className="hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
