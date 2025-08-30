import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, UserCheck, Users, FlaskConical, User, Mail, Lock, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const roles = [
    {
      value: "healthcare_provider",
      label: "Healthcare Provider",
      icon: UserCheck,
      description: "Doctors, nurses, clinicians with patient data access"
    },
    {
      value: "researcher",
      label: "Researcher", 
      icon: FlaskConical,
      description: "Academics and scientists analyzing health trends"
    },
    {
      value: "individual",
      label: "Individual",
      icon: User,
      description: "Patients and individuals managing personal health data"
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate form
        if (password !== confirmPassword) {
          toast({
            title: "Error",
            description: "Passwords do not match",
            variant: "destructive",
          });
          return;
        }

        if (!selectedRole) {
          toast({
            title: "Error", 
            description: "Please select a role",
            variant: "destructive",
          });
          return;
        }

        // Sign up with Supabase
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/mfa-setup`,
            data: {
              first_name: firstName,
              last_name: lastName,
              role: selectedRole,
            }
          }
        });

        if (error) {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        if (data.user) {
          toast({
            title: "Account Created",
            description: "Please check your email to verify your account, then set up MFA.",
          });
          navigate('/mfa-setup');
        }
      } else {
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Sign In Failed",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        if (data.user) {
          // Check if MFA is enabled
          const { data: profile } = await supabase
            .from('profiles')
            .select('mfa_enabled')
            .eq('user_id', data.user.id)
            .single();

          if (profile?.mfa_enabled) {
            // Redirect to MFA verification
            navigate('/mfa-verify');
          } else {
            // Redirect to MFA setup
            navigate('/mfa-setup');
          }
        }
      }
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

  const selectedRoleData = roles.find(role => role.value === selectedRole);

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
          <h1 className="text-2xl font-bold">
            {isSignUp ? "Secure Registration" : "Secure Sign In"}
          </h1>
          <p className="text-muted-foreground">
            {isSignUp ? "Create your protected health data account" : "Access your secure health data platform"}
          </p>
          <Badge variant="secondary" className="bg-accent-light text-accent-foreground">
            🔐 MFA Required • AES Encrypted
          </Badge>
        </div>

        {/* Auth Form */}
        <Card className="shadow-medical bg-gradient-card border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? "Please select your role and provide secure credentials"
                : "Enter your credentials to access the platform"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection (Sign Up Only) */}
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="role">Account Type</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center space-x-2">
                            <role.icon className="h-4 w-4" />
                            <span>{role.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRoleData && (
                    <div className="p-3 bg-muted rounded-md">
                      <div className="flex items-center space-x-2 mb-1">
                        <selectedRoleData.icon className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{selectedRoleData.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedRoleData.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Name Fields (Sign Up Only) */}
              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Enter secure password"
                    required
                  />
                </div>
              </div>

              {/* Confirm Password (Sign Up Only) */}
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                </div>
              )}

              {/* MFA Notice */}
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
                <div className="flex items-center space-x-2">
                  <QrCode className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">MFA Setup Required</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  After {isSignUp ? "registration" : "login"}, you'll set up mandatory two-factor authentication
                </p>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full shadow-medical" size="lg" disabled={loading}>
                {loading ? "Processing..." : (isSignUp ? "Create Secure Account" : "Sign In Securely")}
                <Shield className="ml-2 h-4 w-4" />
              </Button>
            </form>

            {/* Toggle Sign Up/In */}
            <div className="text-center mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
              </p>
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-medium"
              >
                {isSignUp ? "Sign In" : "Create Account"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;