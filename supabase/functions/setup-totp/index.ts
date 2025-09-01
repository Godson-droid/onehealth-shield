import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as OTPAuth from "https://esm.sh/otpauth@9.2.3"

console.log('Setup TOTP function starting...')

// Create TOTP instance with standard settings
const createTOTP = (secret: string) => {
  return new OTPAuth.TOTP({
    issuer: "OneHealthShield",
    label: "OneHealthShield",
    algorithm: "SHA1",
    digits: 6,
    period: 60,
    secret: secret,
  });
};

console.log('TOTP configuration: 60s period, SHA1, 6 digits')

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
      console.error('Missing required parameters:', { userId: !!userId, token: !!token, secret: !!secret })
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
    
    try {
      // Create TOTP instance
      const totp = createTOTP(secret)
      
      // Generate expected token for comparison (debugging)
      const expectedToken = totp.generate()
      const currentTime = Math.floor(Date.now() / 1000)
      console.log('Expected current token:', expectedToken)
      console.log('Current timestamp:', currentTime)
      console.log('Current period:', Math.floor(currentTime / 60))
      
      // Verify TOTP token with tolerance
      const isValid = totp.validate({ token: token, window: 2 }) !== null
      
      console.log('TOTP verification result:', isValid)
      
      if (!isValid) {
        // Try generating tokens for current and adjacent time windows
        const currentWindow = Math.floor(currentTime / 60)
        const prevToken = new OTPAuth.TOTP({
          issuer: "OneHealthShield",
          algorithm: "SHA1",
          digits: 6,
          period: 60,
          secret: secret,
        }).generate({ timestamp: (currentWindow - 1) * 60 * 1000 })
        
        const nextToken = new OTPAuth.TOTP({
          issuer: "OneHealthShield", 
          algorithm: "SHA1",
          digits: 6,
          period: 60,
          secret: secret,
        }).generate({ timestamp: (currentWindow + 1) * 60 * 1000 })
        
        console.log('Previous window token:', prevToken)
        console.log('Next window token:', nextToken)
        console.log('Token matches any window:', [expectedToken, prevToken, nextToken].includes(token))
      }

      if (!isValid) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid verification code',
            debug: {
              received: token,
              expected: expectedToken,
              timestamp: currentTime
            }
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (totpError) {
      console.error('TOTP generation/verification error:', totpError)
      return new Response(
        JSON.stringify({ error: 'TOTP verification failed', details: totpError.message }),
        { 
          status: 500, 
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