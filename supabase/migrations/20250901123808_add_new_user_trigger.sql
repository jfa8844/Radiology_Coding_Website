-- 1. Drop the existing trigger if it exists to avoid conflicts.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create the trigger.
-- This trigger creates a profile for a new user.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();