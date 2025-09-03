-- Add privacy field to health_records table
ALTER TABLE public.health_records 
ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Update RLS policies to allow researchers and health providers to view public records
CREATE POLICY "Researchers and health providers can view public records" 
ON public.health_records 
FOR SELECT 
USING (
  is_public = true 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('researcher', 'health_provider')
  )
);

-- Allow authenticated users to view public records (for sharing)
CREATE POLICY "Anyone can view public records for sharing" 
ON public.health_records 
FOR SELECT 
USING (is_public = true);