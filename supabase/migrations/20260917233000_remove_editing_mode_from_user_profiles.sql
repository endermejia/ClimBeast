-- Drop editing_mode column from user_profiles table as editing is now directly permission-based
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS editing_mode;
