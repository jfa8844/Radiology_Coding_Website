

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."procedures" (
    "id" bigint NOT NULL,
    "cpt_code" "text" NOT NULL,
    "notes" "text",
    "description" "text",
    "abbreviation" "text",
    "modality" "text",
    "wrvu" numeric(5,2),
    "default_display" boolean DEFAULT true,
    "default_column" integer,
    "default_row" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."procedures" OWNER TO "postgres";


ALTER TABLE "public"."procedures" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."procedures_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shift_entries" (
    "id" bigint NOT NULL,
    "shift_id" bigint NOT NULL,
    "procedure_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "count" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shift_entries" OWNER TO "postgres";


ALTER TABLE "public"."shift_entries" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."shift_entries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shift_title" "text",
    "shift_type" "text",
    "shift_start_time" timestamp with time zone NOT NULL,
    "shift_end_time" timestamp with time zone,
    "goal_wrvu_per_hour" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shift_length_hours" numeric,
    "total_wrvu" numeric,
    "actual_wrvu_per_hour" numeric
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


ALTER TABLE "public"."shifts" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."shifts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_procedure_preferences" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "procedure_id" bigint NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "display_column" integer,
    "display_row" integer
);


ALTER TABLE "public"."user_procedure_preferences" OWNER TO "postgres";


ALTER TABLE "public"."user_procedure_preferences" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_procedure_preferences_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_cpt_code_key" UNIQUE ("cpt_code");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_entries"
    ADD CONSTRAINT "shift_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_entries"
    ADD CONSTRAINT "shift_entries_shift_id_procedure_id_key" UNIQUE ("shift_id", "procedure_id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "unique_row_column" UNIQUE ("default_column", "default_row");



ALTER TABLE ONLY "public"."user_procedure_preferences"
    ADD CONSTRAINT "user_procedure_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_procedure_preferences"
    ADD CONSTRAINT "user_procedure_preferences_user_id_procedure_id_key" UNIQUE ("user_id", "procedure_id");



CREATE UNIQUE INDEX "user_procedure_preferences_user_display_position_idx" ON "public"."user_procedure_preferences" USING "btree" ("user_id", "display_column", "display_row") WHERE (("display_column" IS NOT NULL) AND ("display_row" IS NOT NULL));



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_entries"
    ADD CONSTRAINT "shift_entries_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_entries"
    ADD CONSTRAINT "shift_entries_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_entries"
    ADD CONSTRAINT "shift_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_procedure_preferences"
    ADD CONSTRAINT "user_procedure_preferences_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_procedure_preferences"
    ADD CONSTRAINT "user_procedure_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can view procedures." ON "public"."procedures" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."procedures" FOR SELECT USING (true);



CREATE POLICY "Users can manage their own procedure preferences." ON "public"."user_procedure_preferences" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own shift entries." ON "public"."shift_entries" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own shifts." ON "public"."shifts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own profile." ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."procedures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shift_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_procedure_preferences" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."procedures" TO "anon";
GRANT ALL ON TABLE "public"."procedures" TO "authenticated";
GRANT ALL ON TABLE "public"."procedures" TO "service_role";



GRANT ALL ON SEQUENCE "public"."procedures_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."procedures_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."procedures_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."shift_entries" TO "anon";
GRANT ALL ON TABLE "public"."shift_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_entries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."shift_entries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."shift_entries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."shift_entries_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."shifts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."shifts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."shifts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_procedure_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_procedure_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_procedure_preferences" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_procedure_preferences_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_procedure_preferences_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_procedure_preferences_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
