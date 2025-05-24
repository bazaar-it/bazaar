CREATE TABLE "bazaar-vid_scene" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"name" varchar(255) DEFAULT 'Scene' NOT NULL,
	"tsxCode" text NOT NULL,
	"props" jsonb,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene" ADD CONSTRAINT "bazaar-vid_scene_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scene_project_idx" ON "bazaar-vid_scene" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "scene_order_idx" ON "bazaar-vid_scene" USING btree ("projectId","order");