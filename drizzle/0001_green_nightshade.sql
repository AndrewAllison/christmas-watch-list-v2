CREATE TABLE "season_entries" (
	"user_id" text NOT NULL,
	"media_id" uuid NOT NULL,
	"season_year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "season_entries_user_id_media_id_season_year_pk" PRIMARY KEY("user_id","media_id","season_year")
);
--> statement-breakpoint
ALTER TABLE "season_entries" ADD CONSTRAINT "season_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_entries" ADD CONSTRAINT "season_entries_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;