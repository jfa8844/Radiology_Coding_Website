CREATE TABLE IF NOT EXISTS "public"."user_columns" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "display_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."user_columns" OWNER TO "postgres";

ALTER TABLE "public"."user_columns" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_columns_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE ONLY "public"."user_columns"
    ADD CONSTRAINT "user_columns_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_columns"
    ADD CONSTRAINT "user_columns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "user_columns_user_id_display_order_idx" ON "public"."user_columns" USING "btree" ("user_id", "display_order");

ALTER TABLE "public"."user_columns" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own columns." ON "public"."user_columns"
    FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own columns." ON "public"."user_columns"
    FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can update their own columns." ON "public"."user_columns"
    FOR UPDATE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can delete their own columns." ON "public"."user_columns"
    FOR DELETE USING (("auth"."uid"() = "user_id"));

GRANT ALL ON TABLE "public"."user_columns" TO "anon";
GRANT ALL ON TABLE "public"."user_columns" TO "authenticated";
GRANT ALL ON TABLE "public"."user_columns" TO "service_role";
