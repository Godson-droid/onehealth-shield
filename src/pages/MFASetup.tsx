import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, QrCode, Key, Smartphone, Copy, Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MFASetup = () => {
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Simulate QR code data (in real implementation, this would come from backend)
  const secretKey = "JBSWY3DPEHPK3PXP7ABCDEFGHIJKLMNOP";
  const qrCodeUrl = `otpauth://totp/OneHealthShield:user@example.com?secret=${secretKey}&issuer=OneHealthShield`;

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
    };

    checkUser();

    // Simulate QR code generation
    const timer = setTimeout(() => {
      setQrCodeGenerated(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

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

      // In a real implementation, you would verify the TOTP code here
      // For now, we'll just update the user's MFA status
      const { error } = await supabase
        .from('profiles')
        .update({ 
          mfa_enabled: true,
          mfa_secret: secretKey 
        })
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to enable MFA. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "MFA Enabled",
        description: "Two-factor authentication has been successfully enabled for your account.",
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              OneHealth Shield
            </span>
          </div>
          <h1 className="text-3xl font-bold">Multi-Factor Authentication</h1>
          <p className="text-muted-foreground">
            Secure your health data with mandatory two-factor authentication
          </p>
          <Badge variant="destructive" className="bg-warning text-warning-foreground">
            ⚠️ Required for Platform Access
          </Badge>
        </div>

        {/* MFA Setup */}
        <Card className="shadow-medical bg-gradient-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-primary" />
              <span>Setup Two-Factor Authentication</span>
            </CardTitle>
            <CardDescription>
              Choose your preferred method to secure your OneHealth Shield account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="qr-code" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr-code" className="flex items-center space-x-2">
                  <QrCode className="h-4 w-4" />
                  <span>QR Code</span>
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Manual Entry</span>
                </TabsTrigger>
              </TabsList>

              {/* QR Code Setup */}
              <TabsContent value="qr-code" className="space-y-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Scan QR Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code
                  </p>
                  
                  <div className="flex justify-center">
                    {qrCodeGenerated ? (
                      <div className="p-4 bg-white rounded-lg shadow-card">
                        {/* In real implementation, use a QR code library */}
                        <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <QrCode className="h-16 w-16 mx-auto text-primary" />
                            <p className="text-xs text-muted-foreground">QR Code Generated</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center animate-pulse">
                        <p className="text-muted-foreground">Generating QR Code...</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Or copy this secret key:</Label>
                    <div className="flex items-center space-x-2">
                      <Input value={secretKey} readOnly className="font-mono text-sm" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopySecret}
                      >
                        {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Manual Entry Setup */}
              <TabsContent value="manual" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Manual Setup</h3>
                  <p className="text-sm text-muted-foreground">
                    If you can't scan the QR code, manually enter this information in your authenticator app:
                  </p>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input value="OneHealth Shield" readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Account User</Label>
                        <Input value={user?.email || "Loading..."} readOnly />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Secret Key</Label>
                      <div className="flex items-center space-x-2">
                        <Input value={secretKey} readOnly className="font-mono" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopySecret}
                        >
                          {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Time Based</Label>
                        <Input value="Yes" readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Algorithm</Label>
                        <Input value="SHA1" readOnly />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Verification */}
            <div className="mt-8 pt-6 border-t">
              <form onSubmit={handleVerifyMFA} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification">Verification Code</Label>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code from your authenticator app
                  </p>
                  <Input
                    id="verification"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-lg font-mono tracking-widest"
                    required
                  />
                </div>

                <Button type="submit" className="w-full shadow-medical" size="lg" disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Complete Setup"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-accent-light rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-accent mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Security Notice</p>
                  <p className="text-xs text-muted-foreground">
                    Store your secret key securely. If you lose access to your authenticator, 
                    you'll need to contact support to regain access to your OneHealth Shield account.
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

export default MFASetup;