import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

interface HealthRecord {
  id: string
  record_type: string
  patient_name: string
  location: string
  description: string
  user_id: string
}

interface BlockchainBlock {
  block_number: number
  previous_hash: string
  current_hash: string
  merkle_root: string
  timestamp: string
  nonce: number
  difficulty: number
  transactions_count: number
  miner_node_id: string
}

// Initialize Supabase client
const supabaseUrl = 'https://xbgbjcshndlaubwowuty.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZ2JqY3NobmRsYXVid293dXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTg0MTEsImV4cCI6MjA3MTk3NDQxMX0.U2T2UloHYHyVDD07A6MWfMpZMJzwDjXOVZBJnNmhYQ0'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { method } = req
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (method === 'POST' && action === 'create_record') {
      return await handleCreateRecord(req, supabase)
    } else if (method === 'GET' && action === 'network_stats') {
      return await handleNetworkStats(supabase)
    } else if (method === 'GET' && action === 'verification_status') {
      const recordId = url.searchParams.get('record_id')
      return await handleVerificationStatus(supabase, recordId)
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleCreateRecord(req: Request, supabase: any) {
  const { record_type, patient_name, location, description, user_id } = await req.json()

  // Step 1: Encrypt the health data using AES-256
  const healthData = JSON.stringify({
    record_type,
    patient_name,
    location,
    description,
    timestamp: new Date().toISOString()
  })

  const encrypted_data = await encryptData(healthData)

  // Step 2: Create health record in database
  const { data: record, error: recordError } = await supabase
    .from('health_records')
    .insert({
      user_id,
      record_type,
      patient_name,
      location,
      description,
      encrypted_data,
      verification_status: 'pending'
    })
    .select()
    .single()

  if (recordError) {
    throw new Error(`Failed to create health record: ${recordError.message}`)
  }

  // Step 3: Start blockchain mining process
  const miningResult = await mineNewBlock(supabase, record)

  // Step 4: Update health record with blockchain info
  const { error: updateError } = await supabase
    .from('health_records')
    .update({
      blockchain_hash: miningResult.block_hash,
      transaction_id: miningResult.transaction_id,
      block_number: miningResult.block_number,
      verification_status: 'verified'
    })
    .eq('id', record.id)

  if (updateError) {
    throw new Error(`Failed to update health record: ${updateError.message}`)
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      record_id: record.id,
      blockchain_hash: miningResult.block_hash,
      transaction_id: miningResult.transaction_id,
      block_number: miningResult.block_number
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleNetworkStats(supabase: any) {
  const { data: nodes, error: nodesError } = await supabase
    .from('blockchain_nodes')
    .select('*')

  if (nodesError) {
    throw new Error(`Failed to fetch nodes: ${nodesError.message}`)
  }

  const { data: blocks, error: blocksError } = await supabase
    .from('blockchain_blocks')
    .select('block_number')
    .order('block_number', { ascending: false })
    .limit(1)

  if (blocksError) {
    throw new Error(`Failed to fetch blocks: ${blocksError.message}`)
  }

  const { data: records, error: recordsError } = await supabase
    .from('health_records')
    .select('verification_status')

  if (recordsError) {
    throw new Error(`Failed to fetch records: ${recordsError.message}`)
  }

  const totalNodes = nodes.length
  const activeNodes = nodes.filter((n: any) => n.status === 'active').length
  const currentBlockHeight = blocks[0]?.block_number || 0
  const totalTransactions = records.length
  const averageHashRate = Math.floor(Math.random() * 50 + 150) // Simulated hash rate

  return new Response(
    JSON.stringify({
      total_nodes: totalNodes,
      active_nodes: activeNodes,
      current_block_height: currentBlockHeight,
      total_transactions: totalTransactions,
      average_hash_rate: averageHashRate,
      network_difficulty: 4
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleVerificationStatus(supabase: any, recordId: string | null) {
  if (!recordId) {
    throw new Error('Record ID is required')
  }

  const { data: record, error } = await supabase
    .from('health_records')
    .select('*')
    .eq('id', recordId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch record: ${error.message}`)
  }

  return new Response(
    JSON.stringify({
      record_id: record.id,
      verification_status: record.verification_status,
      blockchain_hash: record.blockchain_hash,
      transaction_id: record.transaction_id,
      block_number: record.block_number,
      created_at: record.created_at
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function encryptData(data: string): Promise<string> {
  // Generate a random key for AES-256 encryption
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  // Encrypt the data
  const encodedData = new TextEncoder().encode(data)
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  )

  // Export key for storage (in production, use proper key management)
  const exportedKey = await crypto.subtle.exportKey('raw', key)
  
  // Combine IV + key + encrypted data for storage
  const combined = new Uint8Array(iv.length + exportedKey.byteLength + encryptedBuffer.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(exportedKey), iv.length)
  combined.set(new Uint8Array(encryptedBuffer), iv.length + exportedKey.byteLength)

  // Return as base64 string
  return btoa(String.fromCharCode(...combined))
}

async function mineNewBlock(supabase: any, record: any): Promise<any> {
  // Get the latest block to create the next one
  const { data: latestBlock, error: blockError } = await supabase
    .from('blockchain_blocks')
    .select('*')
    .order('block_number', { ascending: false })
    .limit(1)
    .single()

  if (blockError && blockError.code !== 'PGRST116') { // PGRST116 is "not found"
    throw new Error(`Failed to fetch latest block: ${blockError.message}`)
  }

  const previousBlock = latestBlock || {
    block_number: -1,
    current_hash: '0000000000000000000000000000000000000000000000000000000000000000'
  }

  const nextBlockNumber = previousBlock.block_number + 1
  const previousHash = previousBlock.current_hash
  
  // Create transaction data
  const transactionData = {
    record_id: record.id,
    type: 'health_record',
    data_hash: await hashString(record.encrypted_data),
    timestamp: new Date().toISOString()
  }

  const merkleRoot = await hashString(JSON.stringify(transactionData))
  const transactionId = await hashString(`${record.id}_${Date.now()}`)

  // Simple proof-of-work mining simulation
  let nonce = 0
  let blockHash = ''
  const difficulty = 4
  const target = '0'.repeat(difficulty)

  do {
    nonce++
    const blockContent = `${nextBlockNumber}${previousHash}${merkleRoot}${new Date().toISOString()}${nonce}`
    blockHash = await hashString(blockContent)
  } while (!blockHash.startsWith(target) && nonce < 100000)

  // Select a random miner node
  const { data: nodes } = await supabase
    .from('blockchain_nodes')
    .select('node_id')
    .eq('status', 'active')

  const randomNode = nodes[Math.floor(Math.random() * nodes.length)]

  // Create new block
  const { data: newBlock, error: newBlockError } = await supabase
    .from('blockchain_blocks')
    .insert({
      block_number: nextBlockNumber,
      previous_hash: previousHash,
      current_hash: blockHash,
      merkle_root: merkleRoot,
      nonce,
      difficulty,
      transactions_count: 1,
      miner_node_id: randomNode?.node_id || 'node-lagos-01'
    })
    .select()
    .single()

  if (newBlockError) {
    throw new Error(`Failed to create new block: ${newBlockError.message}`)
  }

  // Update miner's block count
  await supabase
    .from('blockchain_nodes')
    .update({ blocks_mined: supabase.rpc('increment_blocks_mined') })
    .eq('node_id', randomNode?.node_id || 'node-lagos-01')

  return {
    block_hash: blockHash,
    transaction_id: transactionId,
    block_number: nextBlockNumber
  }
}

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}