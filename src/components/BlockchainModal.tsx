import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, Shield, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface BlockchainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BlockchainModal = ({ open, onOpenChange }: BlockchainModalProps) => {
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const verificationSteps = [
    { 
      name: "Initializing Blockchain Network", 
      description: "Connecting to Nigerian Health Blockchain Network",
      status: "completed" 
    },
    { 
      name: "Validating Record Integrity", 
      description: "Verifying AES-256 encryption and data consistency",
      status: "completed" 
    },
    { 
      name: "Mining Block", 
      description: "Adding record to distributed ledger",
      status: "in-progress" 
    },
    { 
      name: "Network Consensus", 
      description: "Confirming with network nodes across Nigeria",
      status: "pending" 
    },
    { 
      name: "Blockchain Verification Complete", 
      description: "Record permanently secured on blockchain",
      status: "pending" 
    }
  ];

  const blockchainStats = [
    { label: "Network Nodes", value: "47", description: "Active nodes across Nigeria" },
    { label: "Block Height", value: "15,432", description: "Current blockchain height" },
    { label: "Hash Rate", value: "2.3 TH/s", description: "Network security strength" },
    { label: "Confirmation Time", value: "~3 min", description: "Average verification time" }
  ];

  useEffect(() => {
    if (open) {
      const interval = setInterval(() => {
        setVerificationProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });

        setCurrentStep((prev) => {
          if (verificationProgress >= 20 && prev < 1) return 1;
          if (verificationProgress >= 40 && prev < 2) return 2;
          if (verificationProgress >= 70 && prev < 3) return 3;
          if (verificationProgress >= 100 && prev < 4) return 4;
          return prev;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [open, verificationProgress]);

  const getStepIcon = (index: number, status: string) => {
    if (index < currentStep) return <CheckCircle className="h-5 w-5 text-accent" />;
    if (index === currentStep && status === "in-progress") return <Clock className="h-5 w-5 text-primary animate-spin" />;
    return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary" />
            <span>Blockchain Verification Status</span>
          </DialogTitle>
          <DialogDescription>
            Real-time status of your health record being added to the Nigerian Health Blockchain
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Verification Progress</span>
              <span className="text-sm text-muted-foreground">{verificationProgress}%</span>
            </div>
            <Progress value={verificationProgress} className="h-2" />
          </div>

          {/* Current Steps */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Verification Steps</h4>
            {verificationSteps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3">
                {getStepIcon(index, step.status)}
                <div className="flex-1 space-y-1">
                  <p className={`text-sm font-medium ${
                    index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {index <= currentStep && (
                  <Badge variant="secondary" className="text-xs">
                    {index < currentStep ? 'Complete' : 'In Progress'}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Network Stats */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Nigerian Health Blockchain Network</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {blockchainStats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-lg font-bold text-primary">{stat.value}</p>
                  <p className="text-xs font-medium">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              ))}
            </div>
          </div>

          {verificationProgress === 100 && (
            <div className="bg-accent-light p-4 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="font-medium text-accent">Blockchain Verification Complete!</p>
              <p className="text-sm text-muted-foreground">
                Your health record has been successfully encrypted and added to the blockchain.
              </p>
              <Button className="mt-3" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockchainModal;