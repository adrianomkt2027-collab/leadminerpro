
ALTER TABLE public.user_settings
ADD COLUMN evolution_api_url text DEFAULT '',
ADD COLUMN evolution_api_key text DEFAULT '';
