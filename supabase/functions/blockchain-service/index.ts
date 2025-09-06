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
    let action = url.searchParams.get('action')
    let requestBody = null
    
    // Parse body once and reuse
    if (method === 'POST') {
      try {
        requestBody = await req.json()
        if (!action && requestBody.action) {
          action = requestBody.action
        }
      } catch (error) {
        console.error('Error parsing request body:', error)
      }
    }

    if (method === 'POST' && action === 'create_record') {
      return await handleCreateRecord(requestBody, supabase)
    } else if ((method === 'GET' || method === 'POST') && action === 'network_stats') {
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

async function handleCreateRecord(requestBody: any, supabase: any) {
  const { record_type, patient_name, location, description, user_id, is_public = false, existing_record_id } = requestBody

  console.log('Creating record:', { record_type, patient_name, location, user_id, is_public })

  try {
    // Generate unique identifier based on record type
    const generateUniqueId = (type: string, name: string) => {
      const prefix = type === 'human' ? 'HUM' : type === 'animal' ? 'ANM' : 'ENV';
      const timestamp = Date.now().toString().slice(-6);
      const nameHash = name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
      return `${prefix}-${nameHash}-${timestamp}`;
    };

    const uniqueId = generateUniqueId(record_type, patient_name);

    // Step 1: Encrypt the health data using AES-256
    const healthData = JSON.stringify({
      unique_id: uniqueId,
      record_type,
      patient_name,
      location,
      description,
      timestamp: new Date().toISOString()
    })

    console.log('Encrypting health data...')
    const encrypted_data = await encryptData(healthData)
    console.log('Health data encrypted successfully')

    // Step 2: Get service role key and create client
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    console.log('Service role key check:', { exists: !!serviceRoleKey, length: serviceRoleKey?.length })
    
    if (!serviceRoleKey) {
      console.error('Service role key not found in environment')
      throw new Error('Service role key not available - check Supabase secrets configuration')
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    let record
    
    if (existing_record_id) {
      // Update existing record instead of creating new one
      console.log('Updating existing record:', existing_record_id)
      const { data: existingRecord, error: recordError } = await serviceSupabase
        .from('health_records')
        .update({
          encrypted_data,
          verification_status: 'pending'
        })
        .eq('id', existing_record_id)
        .select()
        .single()
      
      if (recordError) {
        console.error('Database update error:', recordError)
        throw new Error(`Failed to update health record: ${recordError.message}`)
      }
      
      record = existingRecord
    } else {
      // Create new record
      console.log('Inserting record into database...')
      const { data: newRecord, error: recordError } = await serviceSupabase
        .from('health_records')
        .insert({
          user_id,
          record_type,
          patient_name: `${uniqueId} - ${patient_name}`,
          location,
          description,
          encrypted_data,
          verification_status: 'pending',
          is_public
        })
        .select()
        .single()
      
      if (recordError) {
        console.error('Database insert error:', recordError)
        throw new Error(`Failed to create health record: ${recordError.message}`)
      }
      
      record = newRecord
    }

    if (recordError) {
      console.error('Database insert error:', recordError)
      throw new Error(`Failed to create health record: ${recordError.message}`)
    }

    console.log('Record created successfully:', record.id)

    // Step 3: Start blockchain mining process
    console.log('Starting blockchain mining process...')
    try {
      const miningResult = await mineNewBlock(serviceSupabase, record)
      console.log('Mining completed successfully:', miningResult)

      // Step 4: Update health record with blockchain info
      console.log('Updating record with blockchain data...')
      const { data: updatedRecord, error: updateError } = await serviceSupabase
        .from('health_records')
        .update({
          blockchain_hash: miningResult.block_hash,
          transaction_id: miningResult.transaction_id,
          block_number: miningResult.block_number,
          verification_status: 'verified'
        })
        .eq('id', record.id)
        .select()
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        throw new Error(`Failed to update record with blockchain data: ${updateError.message}`)
      }

      console.log('Record verification completed successfully')
      return new Response(
        JSON.stringify({ 
          success: true, 
          record_id: record.id,
          blockchain_hash: miningResult.block_hash,
          transaction_id: miningResult.transaction_id,
          block_number: miningResult.block_number,
          verification_status: 'verified'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (miningError) {
      console.error('Mining process failed:', miningError)
      
      // Try to update record to show mining failure
      try {
        await serviceSupabase
          .from('health_records')
          .update({
            verification_status: 'failed',
            description: record.description + ' (Blockchain verification failed)'
          })
          .eq('id', record.id)
      } catch (finalError) {
        console.error('Failed to update record status:', finalError)
      }
      
      throw new Error(`Blockchain verification failed: ${miningError.message}`)
    }

  } catch (error) {
    console.error('Error in handleCreateRecord:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
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
  console.log('Mining new block for record:', record.id)
  
  try {
    // Get the latest block to create the next one
    const { data: latestBlock, error: blockError } = await supabase
      .from('blockchain_blocks')
      .select('*')
      .order('block_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (blockError) {
      console.error('Error fetching latest block:', blockError)
      throw new Error(`Failed to fetch latest block: ${blockError.message}`)
    }

    const previousBlock = latestBlock || {
      block_number: -1,
      current_hash: '0000000000000000000000000000000000000000000000000000000000000000'
    }

    console.log('Previous block:', previousBlock.block_number)

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

    console.log('Transaction ID generated:', transactionId)

    // Simple proof-of-work mining simulation
    let nonce = 0
    let blockHash = ''
    const difficulty = 4
    const target = '0'.repeat(difficulty)

    console.log('Starting proof-of-work mining...')
    do {
      nonce++
      const blockContent = `${nextBlockNumber}${previousHash}${merkleRoot}${new Date().toISOString()}${nonce}`
      blockHash = await hashString(blockContent)
    } while (!blockHash.startsWith(target) && nonce < 10000) // Reduced iterations for faster processing

    console.log('Mining completed. Hash:', blockHash, 'Nonce:', nonce)

    // Get available miner nodes or use default
    const { data: nodes } = await supabase
      .from('blockchain_nodes')
      .select('node_id')
      .eq('status', 'active')

    const randomNode = nodes && nodes.length > 0 ? nodes[Math.floor(Math.random() * nodes.length)] : null
    const minerNodeId = randomNode?.node_id || 'node-lagos-01'

    console.log('Selected miner node:', minerNodeId)

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
        miner_node_id: minerNodeId
      })
      .select()
      .single()

    if (newBlockError) {
      console.error('Error creating new block:', newBlockError)
      throw new Error(`Failed to create new block: ${newBlockError.message}`)
    }

    console.log('New block created:', newBlock.id)

    // Try to update miner's block count (don't fail if this fails)
    try {
      const { error: updateError } = await supabase
        .rpc('increment_miner_blocks', { node_id: minerNodeId })

      if (updateError) {
        console.log('Warning: Failed to update miner stats:', updateError)
      }
    } catch (updateError) {
      console.log('Warning: Could not update miner stats:', updateError)
    }

    const result = {
      block_hash: blockHash,
      transaction_id: transactionId,
      block_number: nextBlockNumber
    }

    console.log('Mining result:', result)
    return result

  } catch (error) {
    console.error('Mining process failed:', error)
    throw error
  }
}

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}