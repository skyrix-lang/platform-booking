CREATE TYPE "public"."history_reason" AS ENUM('released', 'expired');--> statement-breakpoint
CREATE TABLE "booking_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "booking_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"platform_id" text NOT NULL,
	"trigram" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"booked_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" "history_reason" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"platform_id" text NOT NULL,
	"trigram" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_platform_id_trigram_pk" PRIMARY KEY("platform_id","trigram")
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kubernetes" boolean DEFAULT false NOT NULL,
	"nightly" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_history_released_at_idx" ON "booking_history" USING btree ("released_at");--> statement-breakpoint
CREATE INDEX "bookings_end_date_idx" ON "bookings" USING btree ("end_date");