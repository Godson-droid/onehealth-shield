-- Fix any pending records by triggering blockchain verification for them
-- First, let's see what we have
SELECT id, patient_name, verification_status, created_at 
FROM health_records 
WHERE verification_status = 'pending' 
ORDER BY created_at DESC;

-- Also check if we have the blockchain tables properly set up
SELECT COUNT(*) as block_count FROM blockchain_blocks;
SELECT COUNT(*) as node_count FROM blockchain_nodes;