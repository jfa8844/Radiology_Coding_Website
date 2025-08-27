drop extension if exists "pg_net";


  create table "public"."procedures" (
    "id" bigint generated always as identity not null,
    "cpt_code" text not null,
    "notes" text,
    "description" text,
    "abbreviation" text,
    "modality" text,
    "wrvu" numeric(5,2),
    "default_display" boolean default true,
    "default_column" integer,
    "default_row" integer,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."procedures" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text,
    "updated_at" timestamp with time zone
      );


alter table "public"."profiles" enable row level security;


  create table "public"."shift_entries" (
    "id" bigint generated always as identity not null,
    "shift_id" bigint not null,
    "procedure_id" bigint not null,
    "user_id" uuid not null,
    "count" integer not null default 1,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."shift_entries" enable row level security;


  create table "public"."shifts" (
    "id" bigint generated always as identity not null,
    "user_id" uuid not null,
    "shift_title" text,
    "shift_type" text,
    "shift_start_time" timestamp with time zone not null,
    "shift_end_time" timestamp with time zone,
    "goal_wrvu_per_hour" numeric(5,2),
    "created_at" timestamp with time zone not null default now(),
    "shift_length_hours" numeric,
    "total_wrvu" numeric,
    "actual_wrvu_per_hour" numeric
      );


alter table "public"."shifts" enable row level security;


  create table "public"."user_procedure_preferences" (
    "id" bigint generated always as identity not null,
    "user_id" uuid not null,
    "procedure_id" bigint not null,
    "is_visible" boolean not null default true,
    "display_column" integer,
    "display_row" integer
      );


alter table "public"."user_procedure_preferences" enable row level security;

CREATE UNIQUE INDEX procedures_cpt_code_key ON public.procedures USING btree (cpt_code);

CREATE UNIQUE INDEX procedures_pkey ON public.procedures USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX shift_entries_pkey ON public.shift_entries USING btree (id);

CREATE UNIQUE INDEX shift_entries_shift_id_procedure_id_key ON public.shift_entries USING btree (shift_id, procedure_id);

CREATE UNIQUE INDEX shifts_pkey ON public.shifts USING btree (id);

CREATE UNIQUE INDEX unique_row_column ON public.procedures USING btree (default_column, default_row);

CREATE UNIQUE INDEX user_procedure_preferences_pkey ON public.user_procedure_preferences USING btree (id);

CREATE UNIQUE INDEX user_procedure_preferences_user_display_position_idx ON public.user_procedure_preferences USING btree (user_id, display_column, display_row) WHERE ((display_column IS NOT NULL) AND (display_row IS NOT NULL));

CREATE UNIQUE INDEX user_procedure_preferences_user_id_procedure_id_key ON public.user_procedure_preferences USING btree (user_id, procedure_id);

alter table "public"."procedures" add constraint "procedures_pkey" PRIMARY KEY using index "procedures_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."shift_entries" add constraint "shift_entries_pkey" PRIMARY KEY using index "shift_entries_pkey";

alter table "public"."shifts" add constraint "shifts_pkey" PRIMARY KEY using index "shifts_pkey";

alter table "public"."user_procedure_preferences" add constraint "user_procedure_preferences_pkey" PRIMARY KEY using index "user_procedure_preferences_pkey";

alter table "public"."procedures" add constraint "procedures_cpt_code_key" UNIQUE using index "procedures_cpt_code_key";

alter table "public"."procedures" add constraint "unique_row_column" UNIQUE using index "unique_row_column";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."shift_entries" add constraint "shift_entries_procedure_id_fkey" FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE not valid;

alter table "public"."shift_entries" validate constraint "shift_entries_procedure_id_fkey";

alter table "public"."shift_entries" add constraint "shift_entries_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE not valid;

alter table "public"."shift_entries" validate constraint "shift_entries_shift_id_fkey";

alter table "public"."shift_entries" add constraint "shift_entries_shift_id_procedure_id_key" UNIQUE using index "shift_entries_shift_id_procedure_id_key";

alter table "public"."shift_entries" add constraint "shift_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."shift_entries" validate constraint "shift_entries_user_id_fkey";

alter table "public"."shifts" add constraint "shifts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."shifts" validate constraint "shifts_user_id_fkey";

alter table "public"."user_procedure_preferences" add constraint "user_procedure_preferences_procedure_id_fkey" FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE not valid;

alter table "public"."user_procedure_preferences" validate constraint "user_procedure_preferences_procedure_id_fkey";

alter table "public"."user_procedure_preferences" add constraint "user_procedure_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_procedure_preferences" validate constraint "user_procedure_preferences_user_id_fkey";

alter table "public"."user_procedure_preferences" add constraint "user_procedure_preferences_user_id_procedure_id_key" UNIQUE using index "user_procedure_preferences_user_id_procedure_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$function$
;

grant delete on table "public"."procedures" to "anon";

grant insert on table "public"."procedures" to "anon";

grant references on table "public"."procedures" to "anon";

grant select on table "public"."procedures" to "anon";

grant trigger on table "public"."procedures" to "anon";

grant truncate on table "public"."procedures" to "anon";

grant update on table "public"."procedures" to "anon";

grant delete on table "public"."procedures" to "authenticated";

grant insert on table "public"."procedures" to "authenticated";

grant references on table "public"."procedures" to "authenticated";

grant select on table "public"."procedures" to "authenticated";

grant trigger on table "public"."procedures" to "authenticated";

grant truncate on table "public"."procedures" to "authenticated";

grant update on table "public"."procedures" to "authenticated";

grant delete on table "public"."procedures" to "service_role";

grant insert on table "public"."procedures" to "service_role";

grant references on table "public"."procedures" to "service_role";

grant select on table "public"."procedures" to "service_role";

grant trigger on table "public"."procedures" to "service_role";

grant truncate on table "public"."procedures" to "service_role";

grant update on table "public"."procedures" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."shift_entries" to "anon";

grant insert on table "public"."shift_entries" to "anon";

grant references on table "public"."shift_entries" to "anon";

grant select on table "public"."shift_entries" to "anon";

grant trigger on table "public"."shift_entries" to "anon";

grant truncate on table "public"."shift_entries" to "anon";

grant update on table "public"."shift_entries" to "anon";

grant delete on table "public"."shift_entries" to "authenticated";

grant insert on table "public"."shift_entries" to "authenticated";

grant references on table "public"."shift_entries" to "authenticated";

grant select on table "public"."shift_entries" to "authenticated";

grant trigger on table "public"."shift_entries" to "authenticated";

grant truncate on table "public"."shift_entries" to "authenticated";

grant update on table "public"."shift_entries" to "authenticated";

grant delete on table "public"."shift_entries" to "service_role";

grant insert on table "public"."shift_entries" to "service_role";

grant references on table "public"."shift_entries" to "service_role";

grant select on table "public"."shift_entries" to "service_role";

grant trigger on table "public"."shift_entries" to "service_role";

grant truncate on table "public"."shift_entries" to "service_role";

grant update on table "public"."shift_entries" to "service_role";

grant delete on table "public"."shifts" to "anon";

grant insert on table "public"."shifts" to "anon";

grant references on table "public"."shifts" to "anon";

grant select on table "public"."shifts" to "anon";

grant trigger on table "public"."shifts" to "anon";

grant truncate on table "public"."shifts" to "anon";

grant update on table "public"."shifts" to "anon";

grant delete on table "public"."shifts" to "authenticated";

grant insert on table "public"."shifts" to "authenticated";

grant references on table "public"."shifts" to "authenticated";

grant select on table "public"."shifts" to "authenticated";

grant trigger on table "public"."shifts" to "authenticated";

grant truncate on table "public"."shifts" to "authenticated";

grant update on table "public"."shifts" to "authenticated";

grant delete on table "public"."shifts" to "service_role";

grant insert on table "public"."shifts" to "service_role";

grant references on table "public"."shifts" to "service_role";

grant select on table "public"."shifts" to "service_role";

grant trigger on table "public"."shifts" to "service_role";

grant truncate on table "public"."shifts" to "service_role";

grant update on table "public"."shifts" to "service_role";

grant delete on table "public"."user_procedure_preferences" to "anon";

grant insert on table "public"."user_procedure_preferences" to "anon";

grant references on table "public"."user_procedure_preferences" to "anon";

grant select on table "public"."user_procedure_preferences" to "anon";

grant trigger on table "public"."user_procedure_preferences" to "anon";

grant truncate on table "public"."user_procedure_preferences" to "anon";

grant update on table "public"."user_procedure_preferences" to "anon";

grant delete on table "public"."user_procedure_preferences" to "authenticated";

grant insert on table "public"."user_procedure_preferences" to "authenticated";

grant references on table "public"."user_procedure_preferences" to "authenticated";

grant select on table "public"."user_procedure_preferences" to "authenticated";

grant trigger on table "public"."user_procedure_preferences" to "authenticated";

grant truncate on table "public"."user_procedure_preferences" to "authenticated";

grant update on table "public"."user_procedure_preferences" to "authenticated";

grant delete on table "public"."user_procedure_preferences" to "service_role";

grant insert on table "public"."user_procedure_preferences" to "service_role";

grant references on table "public"."user_procedure_preferences" to "service_role";

grant select on table "public"."user_procedure_preferences" to "service_role";

grant trigger on table "public"."user_procedure_preferences" to "service_role";

grant truncate on table "public"."user_procedure_preferences" to "service_role";

grant update on table "public"."user_procedure_preferences" to "service_role";


  create policy "Authenticated users can view procedures."
  on "public"."procedures"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable read access for all users"
  on "public"."procedures"
  as permissive
  for select
  to public
using (true);



  create policy "Users can update their own profile."
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "Users can view their own profile."
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Users can manage their own shift entries."
  on "public"."shift_entries"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can manage their own shifts."
  on "public"."shifts"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can manage their own procedure preferences."
  on "public"."user_procedure_preferences"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



