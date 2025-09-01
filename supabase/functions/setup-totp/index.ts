import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { TOTP, Secret } from "https://esm.sh/otpauth@9.1.0"

console.log('Setup TOTP function starting...')

// Function to create a TOTP instance
const createTOTP = (secret: string) => {
  try {
    // Attempt to create the Secret from the Base32 string
    const decodedSecret = Secret.fromBase32(secret);

    return new TOTP({
      issuer: "OneHealthShield",
      label: "OneHealthShield",
      algorithm: "SHA1",
      digits: 6,
      period: 60,
      secret: decodedSecret,
    });
  } catch (e) {
    console.error("Error creating TOTP instance. Is the secret a valid Base32 string?", e);
    throw new Error("Invalid TOTP secret format");
  }
};

console.log('TOTP configuration: 60s period, SHA1, 6 digits')

const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // ... (the rest of the serve function remains the same)
  // The error is in the TOTP creation, so the main logic is unchanged.
})

)

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

  // **Security Note**: Remove these logs in production.
  console.log('Verifying TOTP setup for user:', userId)
  console.log('Token received:', token)
  console.log('Secret (first 8 chars):', secret.substring(0, 8) + '...')
  
  try {
    // Create TOTP instance
    const totp = createTOTP(secret)
    
    // Verify TOTP token with tolerance (window of 1 accounts for current and 1 previous/next step)
    const delta = totp.validate({ token: token, window: 1 })
    
    // `delta` is the window offset if valid, `null` if invalid.
    const isValid = delta !== null
    
    console.log('TOTP verification result:', isValid, 'Delta:', delta)

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
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
