import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { encode as base32Encode, decode as base32Decode } from "https://deno.land/std@0.168.0/encoding/base32.ts"

console.log('Setup TOTP function starting...')

// TOTP implementation using Web Crypto API (Deno compatible)
class SimpleTOTP {
  private secret: Uint8Array;
  private period: number = 60;
  private digits: number = 6;

  constructor(secret: string) {
    try {
      // Decode base32 secret
      this.secret = base32Decode(secret.toUpperCase().replace(/=+$/, ''));
    } catch (e) {
      console.error('Error decoding base32 secret:', e);
      throw new Error('Invalid base32 secret');
    }
  }

  private async hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return new Uint8Array(signature);
  }

  private numberToBytes(num: number): Uint8Array {
    const bytes = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
      bytes[i] = num & 0xff;
      num = num >> 8;
    }
    return bytes;
  }

  async generate(timestamp?: number): Promise<string> {
    const now = timestamp || Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(now / this.period);
    const timeBytes = this.numberToBytes(timeStep);

    const hmac = await this.hmacSha1(this.secret, timeBytes);
    const offset = hmac[19] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);

    const otp = (code % Math.pow(10, this.digits)).toString().padStart(this.digits, '0');
    return otp;
  }

  async validate(token: string, window: number = 1): Promise<number | null> {
    const now = Math.floor(Date.now() / 1000);
    
    for (let i = -window; i <= window; i++) {
      const testTime = now + (i * this.period);
      const expectedToken = await this.generate(testTime);
      
      if (token === expectedToken) {
        return i;
      }
    }
    return null;
  }
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
      const totp = new SimpleTOTP(secret)
      
      // Generate current expected token for debugging
      const expectedToken = await totp.generate()
      console.log('Expected token:', expectedToken)
      console.log('Current timestamp:', Math.floor(Date.now() / 1000))
      console.log('Current time period:', Math.floor(Math.floor(Date.now() / 1000) / 60))
      
      // Verify TOTP token with tolerance
      const delta = await totp.validate(token, 1)
      const isValid = delta !== null
      
      console.log('TOTP verification result:', isValid, 'Delta:', delta)

      if (!isValid) {
        // Try adjacent time windows for debugging
        const prevToken = await totp.generate(Math.floor(Date.now() / 1000) - 60)
        const nextToken = await totp.generate(Math.floor(Date.now() / 1000) + 60)
        console.log('Previous window token:', prevToken)
        console.log('Next window token:', nextToken)
        
        return new Response(
          JSON.stringify({ 
            error: 'Invalid verification code',
            debug: {
              received: token,
              expected: expectedToken,
              previous: prevToken,
              next: nextToken
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