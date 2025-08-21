CREATE TABLE "bazaar-vid_icon_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(255),
	"projectId" uuid,
	"sceneId" uuid,
	"iconName" varchar(255) NOT NULL,
	"iconCollection" varchar(100),
	"action" varchar(50) NOT NULL,
	"source" varchar(50) NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_icon_usage" ADD CONSTRAINT "bazaar-vid_icon_usage_userId_bazaar-vid_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_icon_usage" ADD CONSTRAINT "bazaar-vid_icon_usage_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_icon_usage" ADD CONSTRAINT "bazaar-vid_icon_usage_sceneId_bazaar-vid_scene_id_fk" FOREIGN KEY ("sceneId") REFERENCES "public"."bazaar-vid_scene"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "icon_usage_user_idx" ON "bazaar-vid_icon_usage" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "icon_usage_project_idx" ON "bazaar-vid_icon_usage" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "icon_usage_icon_idx" ON "bazaar-vid_icon_usage" USING btree ("iconName");--> statement-breakpoint
CREATE INDEX "icon_usage_collection_idx" ON "bazaar-vid_icon_usage" USING btree ("iconCollection");--> statement-breakpoint
CREATE INDEX "icon_usage_created_idx" ON "bazaar-vid_icon_usage" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "icon_usage_action_idx" ON "bazaar-vid_icon_usage" USING btree ("action");