ALTER TABLE "bazaar-vid_shared_video" DROP CONSTRAINT "bazaar-vid_shared_video_projectId_bazaar-vid_project_id_fk";
--> statement-breakpoint
ALTER TABLE "bazaar-vid_shared_video" DROP CONSTRAINT "bazaar-vid_shared_video_userId_bazaar-vid_user_id_fk";
--> statement-breakpoint
ALTER TABLE "bazaar-vid_shared_video" ADD CONSTRAINT "bazaar-vid_shared_video_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_shared_video" ADD CONSTRAINT "bazaar-vid_shared_video_userId_bazaar-vid_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE cascade ON UPDATE no action;