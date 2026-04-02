-- Add WhatsApp and Summary fields to schedules table
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS whatsapp_message text;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS whatsapp_redirect boolean DEFAULT false;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS show_summary boolean DEFAULT true;

-- Add lead_id to appointments if not exists (already exists in some migrations but ensuring)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='lead_id') THEN
        ALTER TABLE public.appointments ADD COLUMN lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
    END IF;
END $$;
