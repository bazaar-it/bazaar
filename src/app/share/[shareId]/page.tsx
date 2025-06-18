//src/app/share/[shareId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, User, Eye } from "lucide-react";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { type Metadata } from "next";
import { getBazaarUrl, getShareUrl } from "~/lib/utils/url";
import ShareVideoPlayerClient from "./ShareVideoPlayerClient";
import ShareButtons from "./SharePageClient";
import type { InputProps, Scene } from "~/lib/types/video/input-props";
import { format } from "date-fns";
import AppHeader from "~/components/AppHeader";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { shareId } = await params;
    const videoShareRecord = await api.share.getSharedVideo({ shareId });

    const videoTitle = videoShareRecord.project?.inputProps?.meta?.title || videoShareRecord.title || "Shared Video";
    const videoDescription = videoShareRecord.description || "An amazing video created with Bazaar";

    return {
      title: `${videoTitle} - Bazaar`,
      description: videoDescription,
      openGraph: {
        type: "video.other",
        title: videoTitle,
        description: videoDescription,
        url: getShareUrl(shareId),
      },
      twitter: {
        card: "player",
        title: videoTitle,
        description: videoDescription,
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
  const { shareId } = await params;
  const shareData = await api.share.getSharedVideo({ shareId });

  if (!shareData || !shareData.project) {
    return notFound();
  }
  
  const { project, creator, viewCount, createdAt } = shareData;
  const shareUrl = getShareUrl(shareId);
  const inputProps = project.inputProps;

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-100 dark:bg-gray-900/50">
      <AppHeader />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl rounded-xl bg-white dark:bg-black/80 shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="p-6 md:p-8">
            <ShareVideoPlayerClient inputProps={inputProps} />
          </div>
          <div className="bg-gray-50/50 dark:bg-black/30 px-6 py-4 md:px-8 md:py-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                  <span>By {creator?.name ?? 'Anonymous'}</span>
                  <span>{format(new Date(createdAt), 'MMMM d, yyyy')}</span>
                  <span>{inputProps.scenes.length} {inputProps.scenes.length === 1 ? 'scene' : 'scenes'}</span>
                  <span>{viewCount ?? 0} {viewCount === 1 ? 'view' : 'views'}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <ShareButtons
                  shareUrl={shareUrl}
                  shareTitle={project.title}
                  shareDescription={`Check out this video I made with Bazaar: "${project.title}"`}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
