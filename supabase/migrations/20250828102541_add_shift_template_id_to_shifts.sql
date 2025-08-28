-- 1. Add the new foreign key column to the shifts table
ALTER TABLE "public"."shifts" ADD COLUMN "shift_template_id" bigint;

-- 2. Add the foreign key constraint to link to the new table
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_shift_template_id_fkey"
    FOREIGN KEY ("shift_template_id") REFERENCES "public"."shift_templates"("id") ON DELETE SET NULL;
