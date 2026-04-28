-- Ensure profile upserts by user_id are safe for future account creation
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique ON public.profiles (user_id);