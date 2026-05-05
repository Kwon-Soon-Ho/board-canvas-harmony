ALTER TABLE public.leaves DROP CONSTRAINT IF EXISTS leaves_leave_type_check;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS end_time TEXT;
UPDATE public.leaves SET leave_type = '연차' WHERE leave_type NOT IN ('연차','시차');
ALTER TABLE public.leaves ADD CONSTRAINT leaves_leave_type_check CHECK (leave_type IN ('연차','시차'));