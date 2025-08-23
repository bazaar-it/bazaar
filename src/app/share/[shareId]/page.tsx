//src/app/share/[shareId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, User, Eye } from "lucide-react";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { type Metadata } from "next";
import { getBazaarUrl, getShareUrl } from "~/lib/utils/url";
import SharePageContent from "./SharePageContent";
import type { InputProps, Scene } from "~/lib/types/video/input-props";
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
        <SharePageContent
          inputProps={inputProps}
          project={project}
          creator={creator}
          viewCount={viewCount ?? 0}
          createdAt={createdAt}
          shareUrl={shareUrl}
        />
      </main>
    </div>
  );
}
