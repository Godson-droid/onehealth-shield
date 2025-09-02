import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// Removed otplib import to avoid Buffer errors

const MFAVerification = () => {
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // TOTP settings (60s periods, SHA1, 6 digits) - configured on server

  useEffect(() => {
    // Check if user came from login
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      
      // Check if user has MFA enabled
      const { data: profile } = await supabase
        .from('profiles')
        .select('mfa_enabled')
        .eq('user_id', user.id)
        .single();

      if (!profile?.mfa_enabled) {
        navigate('/mfa-setup');
        return;
      }

      setUser(user);
    };

    checkUser();
  }, [navigate]);

  // Timer for TOTP refresh
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 60 - (now % 60);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        toast({
          title: "Error",
          description: "No user found. Please sign in again.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      if (verificationCode.length !== 6) {
        toast({
          title: "Error",
          description: "Please enter a 6-digit verification code",
          variant: "destructive",
        });
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      
      console.log('MFA Verification Debug Info:');
      console.log('User ID:', user.id);
      console.log('Entered Code:', verificationCode);
      console.log('Timestamp:', timestamp);
      console.log('Time in period:', timestamp % 60);
      
      setDebugInfo({
        userId: user.id,
        enteredCode: verificationCode,
        timestamp,
        timeInPeriod: timestamp % 60
      });

      console.log('Attempting MFA verification for user:', user.id);
      console.log('Verification code entered:', verificationCode);
      
      // Call edge function to verify TOTP
      console.log('Calling verify-totp function...');
      const { data, error } = await supabase.functions.invoke('verify-totp', {
        body: { 
          userId: user.id,
          token: verificationCode 
        }
      });
      
      console.log('MFA verification response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Function Error",
          description: `Edge function failed: ${error.message}`,
          variant: "destructive",
        });
        setVerificationCode("");
        return;
      }

      if (data?.valid) {
        toast({
          title: "MFA Verified",
          description: "Authentication successful. Welcome to OneHealth Shield.",
        });
        navigate('/dashboard');
      } else {
        toast({
          title: "Verification Failed", 
          description: data?.error || "Invalid verification code. Please try again.",
          variant: "destructive",
        });
        setVerificationCode("");
      }
    } catch (error) {
      console.error('MFA Verification Error:', error);
      toast({
        title: "Verification Error",
        description: `An unexpected error occurred: ${error}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              OneHealth Shield
            </span>
          </div>
          <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
          <p className="text-muted-foreground">
            Enter the code from your authenticator app
          </p>
          <Badge variant="secondary" className="bg-accent-light text-accent-foreground">
            🔐 Security Required
          </Badge>
        </div>

        {/* MFA Verification */}
        <Card className="shadow-medical bg-gradient-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-primary" />
              <span>Enter Verification Code</span>
            </CardTitle>
            <CardDescription>
              Open your authenticator app and enter the 6-digit code for OneHealth Shield
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyMFA} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification">Verification Code</Label>
                <Input
                  id="verification"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Code refreshes every 60 seconds</span>
                  <div className="flex items-center space-x-1">
                    <RefreshCw className="h-3 w-3" />
                    <span>{timeRemaining}s</span>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full shadow-medical" size="lg" disabled={loading || verificationCode.length !== 6}>
                {loading ? "Verifying..." : "Verify & Sign In"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            {/* Debug Info */}
            {debugInfo && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Debug Info:</p>
                    <div className="text-xs text-muted-foreground font-mono">
                      <div>User: {debugInfo.userId}</div>
                      <div>Code: {debugInfo.enteredCode}</div>
                      <div>Time: {debugInfo.timestamp}</div>
                      <div>Period: {debugInfo.timeInPeriod}/60s</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Help Section */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Having trouble?</p>
                  <p className="text-xs text-muted-foreground">
                    Make sure your device time is synchronized and you're using the correct authenticator app.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Auth */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/auth')}>
            ← Back to Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MFAVerification;