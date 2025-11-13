CREATE TABLE "agent_flows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"configuration" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"usage" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"rate_limit" integer DEFAULT 1000 NOT NULL,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "cloned_voices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" varchar NOT NULL,
	"name" text NOT NULL,
	"model" text NOT NULL,
	"description" text,
	"cloning_mode" text DEFAULT 'instant' NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"processing_started_at" timestamp,
	"processing_completed_at" timestamp,
	"voice_description" text,
	"reference_audio_path" text,
	"voice_characteristics" jsonb,
	"status" text DEFAULT 'ready' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_edges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" varchar NOT NULL,
	"source_node_id" varchar NOT NULL,
	"target_node_id" varchar NOT NULL,
	"label" text,
	"type" text DEFAULT 'default',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_nodes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" varchar NOT NULL,
	"type" text NOT NULL,
	"position" jsonb NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_flows" ADD CONSTRAINT "agent_flows_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloned_voices" ADD CONSTRAINT "cloned_voices_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_edges" ADD CONSTRAINT "flow_edges_flow_id_agent_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."agent_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_edges" ADD CONSTRAINT "flow_edges_source_node_id_flow_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."flow_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_edges" ADD CONSTRAINT "flow_edges_target_node_id_flow_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."flow_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_nodes" ADD CONSTRAINT "flow_nodes_flow_id_agent_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."agent_flows"("id") ON DELETE cascade ON UPDATE no action;