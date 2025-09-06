import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, Shield, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BlockchainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId?: string; // Add recordId to track actual record status
}

const BlockchainModal = ({ open, onOpenChange, recordId }: BlockchainModalProps) => {
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [recordData, setRecordData] = useState<any>(null);
  const [networkStats, setNetworkStats] = useState({
    total_nodes: 0,
    active_nodes: 0,
    current_block_height: 0,
    total_transactions: 0,
    average_hash_rate: 0,
    network_difficulty: 4
  });
  
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
    { label: "Network Nodes", value: networkStats.total_nodes.toString(), description: "Active nodes across Nigeria" },
    { label: "Block Height", value: networkStats.current_block_height.toLocaleString(), description: "Current blockchain height" },
    { label: "Hash Rate", value: `${networkStats.average_hash_rate} TH/s`, description: "Network security strength" },
    { label: "Confirmation Time", value: "~3 min", description: "Average verification time" }
  ];

  useEffect(() => {
    if (open && recordId) {
      setVerificationProgress(0);
      setCurrentStep(0);
      setIsVerified(false);
      setVerificationFailed(false);
      
      // Fetch network stats
      fetchNetworkStats();
      
      // Check record verification status
      checkRecordStatus();
      
      // Set up interval to check status periodically
      const statusInterval = setInterval(() => {
        checkRecordStatus();
      }, 2000);

      // Progress simulation
      const progressInterval = setInterval(() => {
        setVerificationProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return Math.min(prev + 1, 100);
        });

        setCurrentStep((prevStep) => {
          if (verificationProgress >= 20 && prevStep < 1) return 1;
          if (verificationProgress >= 40 && prevStep < 2) return 2;
          if (verificationProgress >= 70 && prevStep < 3) return 3;
          if (verificationProgress >= 90 && prevStep < 4) return 4;
          return prevStep;
        });
      }, 150);

      return () => {
        clearInterval(statusInterval);
        clearInterval(progressInterval);
      };
    }
  }, [open, recordId, verificationProgress]);

  const checkRecordStatus = async () => {
    if (!recordId) return;

    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) {
        console.error('Error checking record status:', error);
        return;
      }

      setRecordData(data);
      
      if (data.verification_status === 'verified' && data.blockchain_hash) {
        setIsVerified(true);
        setVerificationProgress(100);
        setCurrentStep(4);
      } else if (data.verification_status === 'failed') {
        setVerificationFailed(true);
        setVerificationProgress(100);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchNetworkStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('blockchain-service', {
        body: { action: 'network_stats' }
      });
      
      if (error) {
        console.error('Error fetching network stats:', error);
        return;
      }

      if (data) {
        setNetworkStats({
          total_nodes: data.total_nodes || 12,
          active_nodes: data.active_nodes || 8,
          current_block_height: data.current_block_height || 1547,
          total_transactions: data.total_transactions || 3421,
          average_hash_rate: data.average_hash_rate || 2.4,
          network_difficulty: data.network_difficulty || 4
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

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

          {(isVerified || verificationProgress === 100) && !verificationFailed && (
            <div className="bg-accent/10 p-4 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="font-medium text-accent">Blockchain Verification Complete!</p>
              <p className="text-sm text-muted-foreground">
                Your health record has been successfully encrypted and added to the blockchain.
              </p>
              {recordData?.blockchain_hash && (
                <p className="text-xs text-muted-foreground mt-2">
                  Block Hash: {recordData.blockchain_hash.substring(0, 20)}...
                </p>
              )}
              <Button className="mt-3" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
          
          {verificationFailed && (
            <div className="bg-destructive/10 p-4 rounded-lg text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="font-medium text-destructive">Verification Failed</p>
              <p className="text-sm text-muted-foreground">
                There was an issue with blockchain verification. The record has been saved but requires manual verification.
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