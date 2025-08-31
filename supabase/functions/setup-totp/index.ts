import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as OTPLib from "https://esm.sh/otplib@12.0.1"

const { authenticator } = OTPLib

// Configure TOTP settings to match standard authenticator apps
authenticator.options = {
  step: 60,        // 60-second time window
  window: 2,       // Allow 2 steps of tolerance (±120 seconds)
  digits: 6,       // 6-digit codes
  algorithm: 'sha1', // SHA1 algorithm (standard)
  encoding: 'base32' // Base32 encoding
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, token, secret } = await req.json()

    if (!userId || !token || !secret) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Verifying TOTP setup for user:', userId)
    console.log('Token received:', token)
    console.log('Secret (first 8 chars):', secret.substring(0, 8) + '...')
    
    // Verify TOTP token against secret
    const isValid = authenticator.verify({
      token: token,
      secret: secret
    })
    
    console.log('TOTP verification result:', isValid)

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update user profile with MFA enabled and secret
    const { error } = await supabase
      .from('profiles')
      .update({ 
        mfa_enabled: true,
        mfa_secret: secret 
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to enable MFA' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error setting up TOTP:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})