import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = 'https://xbgbjcshndlaubwowuty.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZ2JqY3NobmRsYXVid293dXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTg0MTEsImV4cCI6MjA3MTk3NDQxMX0.U2T2UloHYHyVDD07A6MWfMpZMJzwDjXOVZBJnNmhYQ0'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!serviceRoleKey) {
      throw new Error('Service role key not available')
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get all pending records
    const { data: pendingRecords, error: fetchError } = await serviceSupabase
      .from('health_records')
      .select('*')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch pending records: ${fetchError.message}`)
    }

    console.log(`Found ${pendingRecords?.length || 0} pending records to process`)

    if (!pendingRecords || pendingRecords.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending records to process',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processedCount = 0
    let failedCount = 0

    // Process each pending record by calling the blockchain service
    for (const record of pendingRecords) {
      try {
        console.log(`Processing record: ${record.id}`)
        
        // Call the blockchain service to verify this record
        const response = await fetch(`${supabaseUrl}/functions/v1/blockchain-service`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'create_record',
            record_type: record.record_type,
            patient_name: record.patient_name.split(' - ').pop(), // Remove the unique ID prefix
            location: record.location,
            description: record.description,
            user_id: record.user_id,
            is_public: record.is_public,
            existing_record_id: record.id // Pass the existing record ID
          })
        })

        if (response.ok) {
          processedCount++
          console.log(`Successfully processed record: ${record.id}`)
        } else {
          failedCount++
          console.log(`Failed to process record: ${record.id}`)
        }
      } catch (error) {
        failedCount++
        console.error(`Error processing record ${record.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processing completed`,
        total: pendingRecords.length,
        processed: processedCount,
        failed: failedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing pending records:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})