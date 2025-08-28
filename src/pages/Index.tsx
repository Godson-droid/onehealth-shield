import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Database, Lock, Heart, Leaf, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/onehealth-hero.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: "Blockchain Security",
      description: "Python-based blockchain with AES encryption protects all health data records."
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Healthcare providers, researchers, and individuals with tailored permissions."
    },
    {
      icon: Lock,
      title: "Compulsory MFA",
      description: "QR code and manual entry verification ensures maximum security."
    },
    {
      icon: Database,
      title: "Unified Data Storage",
      description: "Secure storage for human, animal, and environmental health records."
    }
  ];

  const healthAreas = [
    {
      icon: Heart,
      title: "Human Health",
      description: "Patient records, treatment plans, and medical history",
      color: "text-red-500"
    },
    {
      icon: Stethoscope,
      title: "Animal Health",
      description: "Veterinary records, livestock health, and wildlife monitoring",
      color: "text-blue-500"
    },
    {
      icon: Leaf,
      title: "Environmental Health",
      description: "Air quality, water safety, and ecosystem health data",
      color: "text-green-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Navigation */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              OneHealth Shield
            </span>
          </div>
          <div className="flex space-x-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button variant="default" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                🔒 Blockchain-Secured Health Platform
              </Badge>
              <h1 className="text-5xl font-bold leading-tight">
                Protecting{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  OneHealth
                </span>{" "}
                Data with Advanced Security
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                A professional digital system using Python blockchain and AES encryption 
                to secure human, animal, and environmental health records with role-based 
                access and compulsory multi-factor authentication.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="shadow-medical" onClick={() => navigate('/auth')}>
                Start Secure Access
                <Shield className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative">
            <img 
              src={heroImage} 
              alt="OneHealth Digital System Hero" 
              className="rounded-lg shadow-medical w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-primary opacity-10 rounded-lg"></div>
          </div>
        </div>
      </section>

      {/* OneHealth Areas */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">One Health, One Platform</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive health data management across all interconnected domains
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {healthAreas.map((area, index) => (
            <Card key={index} className="shadow-card bg-gradient-card border-0 hover:shadow-medical transition-all duration-300">
              <CardHeader className="text-center">
                <area.icon className={`h-12 w-12 mx-auto mb-4 ${area.color}`} />
                <CardTitle className="text-xl">{area.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  {area.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Security</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced security features designed for healthcare data protection
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-card bg-gradient-card border-0 hover:shadow-secure transition-all duration-300">
              <CardHeader className="text-center">
                <feature.icon className="h-10 w-10 mx-auto mb-4 text-primary" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Secure Your Health Data?</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join healthcare providers, researchers, and individuals who trust 
            OneHealth Shield for their most sensitive data.
          </p>
          <Button size="lg" variant="secondary" className="shadow-glow" onClick={() => navigate('/auth')}>
            Begin Secure Registration
            <Lock className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">OneHealth Shield</span>
            </div>
            <p className="text-muted-foreground text-center">
              © 2024 OneHealth Shield. Professional health data protection platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;