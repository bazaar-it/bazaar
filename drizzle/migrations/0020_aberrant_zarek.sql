CREATE TABLE "bazaar-vid_shared_video" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"projectId" varchar(255) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"title" varchar(255),
	"description" text,
	"videoUrl" varchar(500),
	"thumbnailUrl" varchar(500),
	"isPublic" boolean DEFAULT true,
	"viewCount" integer DEFAULT 0,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_shared_video" ADD CONSTRAINT "bazaar-vid_shared_video_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_shared_video" ADD CONSTRAINT "bazaar-vid_shared_video_userId_bazaar-vid_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;