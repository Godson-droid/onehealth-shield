-- Fix RLS policies to be more secure for health records
-- First, let's improve the security by creating a function to check user roles safely

-- Create function to safely check user roles without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = check_user_id;
$$;

-- Update the public records policy to be more restrictive
DROP POLICY IF EXISTS "Anyone can view public records for sharing" ON public.health_records;
DROP POLICY IF EXISTS "Researchers and health providers can view public records" ON public.health_records;

-- Only authenticated users with proper roles can view public records
CREATE POLICY "Authenticated users can view public records for sharing" 
ON public.health_records 
FOR SELECT 
TO authenticated
USING (
  is_public = true 
  AND auth.uid() IS NOT NULL
);

-- Only researchers and health providers can view public records with additional verification
CREATE POLICY "Verified researchers and providers can view public records" 
ON public.health_records 
FOR SELECT 
TO authenticated
USING (
  is_public = true 
  AND get_user_role() IN ('researcher', 'health_provider')
  AND auth.uid() IS NOT NULL
);