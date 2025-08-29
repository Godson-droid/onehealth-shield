-- Create blockchain-related tables for real blockchain integration

-- Table for storing health records with blockchain hashes
CREATE TABLE public.health_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  record_type TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  encrypted_data TEXT NOT NULL,
  blockchain_hash TEXT,
  transaction_id TEXT,
  block_number INTEGER,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for blockchain network nodes
CREATE TABLE public.blockchain_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  blocks_mined INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for blockchain blocks
CREATE TABLE public.blockchain_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_number INTEGER NOT NULL UNIQUE,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  merkle_root TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nonce INTEGER NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 4,
  transactions_count INTEGER DEFAULT 0,
  miner_node_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_records
CREATE POLICY "Users can view their own records" 
ON public.health_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own records" 
ON public.health_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records" 
ON public.health_records 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for blockchain_nodes (public read access for network stats)
CREATE POLICY "Anyone can view blockchain nodes" 
ON public.blockchain_nodes 
FOR SELECT 
USING (true);

-- RLS Policies for blockchain_blocks (public read access for verification)
CREATE POLICY "Anyone can view blockchain blocks" 
ON public.blockchain_blocks 
FOR SELECT 
USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_health_records_updated_at
BEFORE UPDATE ON public.health_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample blockchain nodes for Nigeria
INSERT INTO public.blockchain_nodes (node_id, location, status, blocks_mined) VALUES
('node-lagos-01', 'Lagos University Teaching Hospital', 'active', 1247),
('node-abuja-01', 'University of Abuja Teaching Hospital', 'active', 1156),
('node-kano-01', 'Aminu Kano Teaching Hospital', 'active', 892),
('node-port-harcourt-01', 'University of Port Harcourt Teaching Hospital', 'active', 734),
('node-ibadan-01', 'University College Hospital Ibadan', 'active', 623),
('node-jos-01', 'Jos University Teaching Hospital', 'active', 445),
('node-maiduguri-01', 'University of Maiduguri Teaching Hospital', 'active', 312),
('node-calabar-01', 'University of Calabar Teaching Hospital', 'active', 278);

-- Insert genesis block
INSERT INTO public.blockchain_blocks (
  block_number, 
  previous_hash, 
  current_hash, 
  merkle_root, 
  nonce, 
  difficulty,
  transactions_count,
  miner_node_id
) VALUES (
  0,
  '0000000000000000000000000000000000000000000000000000000000000000',
  '000001b2f8a4c1d5e9f3a7b2c8e4d9f1a5b7c3e6d2f8a4c1d5e9f3a7b2c8e4d9',
  '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  487623,
  4,
  0,
  'node-lagos-01'
);