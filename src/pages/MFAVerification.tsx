import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MFAVerification = () => {
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

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

      // Call edge function to verify TOTP
      const { data, error } = await supabase.functions.invoke('verify-totp', {
        body: { 
          userId: user.id,
          token: verificationCode 
        }
      });

      if (error) {
        toast({
          title: "Verification Failed",
          description: "Invalid verification code. Please try again.",
          variant: "destructive",
        });
        setVerificationCode("");
        return;
      }

      if (data.valid) {
        toast({
          title: "MFA Verified",
          description: "Authentication successful. Welcome to OneHealth Shield.",
        });
        navigate('/dashboard');
      } else {
        toast({
          title: "Verification Failed",
          description: "Invalid verification code. Please try again.",
          variant: "destructive",
        });
        setVerificationCode("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during verification",
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
                <p className="text-xs text-muted-foreground text-center">
                  Code refreshes every 30 seconds
                </p>
              </div>

              <Button type="submit" className="w-full shadow-medical" size="lg" disabled={loading || verificationCode.length !== 6}>
                {loading ? "Verifying..." : "Verify & Sign In"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

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