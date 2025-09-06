-- Fix the search path for the increment_miner_blocks function
CREATE OR REPLACE FUNCTION increment_miner_blocks(node_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if node exists, if not create it
  INSERT INTO blockchain_nodes (node_id, location, status, blocks_mined, last_seen)
  VALUES (node_id, 'Lagos, Nigeria', 'active', 1, now())
  ON CONFLICT (node_id) 
  DO UPDATE SET 
    blocks_mined = blockchain_nodes.blocks_mined + 1,
    last_seen = now();
END;
$$;