import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Heart, Stethoscope, Leaf, Shield, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordCreated?: () => void;
}

const RecordModal = ({ open, onOpenChange, onRecordCreated }: RecordModalProps) => {
  const [recordType, setRecordType] = useState<string>("");
  const [patientName, setPatientName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call the blockchain service to create record
      const { data, error } = await supabase.functions.invoke('blockchain-service', {
        body: {
          action: 'create_record',
          record_type: recordType,
          patient_name: patientName,
          location: location,
          description: description,
          user_id: user.id
        }
      });

      if (error) {
        throw new Error(error.message || "Failed to create record");
      }

      toast({
        title: "Record Created Successfully",
        description: `Your health record has been encrypted and added to blockchain block #${data.block_number}`,
      });

      // Reset form
      setRecordType("");
      setPatientName("");
      setLocation("");
      setDescription("");
      onOpenChange(false);
      
      // Refresh dashboard data
      if (onRecordCreated) {
        onRecordCreated();
      }
    } catch (error: any) {
      console.error('Error creating record:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const recordTypes = [
    { value: "human", label: "Human Health", icon: Heart, color: "text-red-500", locations: ["Lagos State", "Abuja FCT", "Rivers State", "Kano State", "Ogun State"] },
    { value: "animal", label: "Animal Health", icon: Stethoscope, color: "text-blue-500", locations: ["Kaduna State", "Plateau State", "Taraba State", "Bauchi State", "Niger State"] },
    { value: "environmental", label: "Environmental Health", icon: Leaf, color: "text-green-500", locations: ["Lagos Industrial Zone", "Port Harcourt Refinery Area", "Abuja City Center", "Kano Commercial District"] }
  ];

  const selectedType = recordTypes.find(type => type.value === recordType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>Create New Health Record</span>
          </DialogTitle>
          <DialogDescription>
            Create a new encrypted health record that will be verified on the blockchain
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Record Type</Label>
            <Select value={recordType} onValueChange={setRecordType}>
              <SelectTrigger>
                <SelectValue placeholder="Select health record type" />
              </SelectTrigger>
              <SelectContent>
                {recordTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center space-x-2">
                      <type.icon className={`h-4 w-4 ${type.color}`} />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType && (
            <>
              <div className="space-y-2">
                <Label>Patient/Subject Name</Label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder={
                    recordType === "human" ? "Patient full name" :
                    recordType === "animal" ? "Animal/Livestock identifier" :
                    "Environmental area/zone name"
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location in Nigeria" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedType.locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter medical details, observations, or environmental data..."
                  rows={4}
                  required
                />
              </div>

              <div className="bg-accent-light p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Security Features</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-accent" />
                    <span>AES-256 Encryption</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-accent" />
                    <span>Blockchain Verification</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-accent" />
                    <span>Role-based Access Control</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!recordType || !patientName || !location || !description || loading}>
              {loading ? "Creating & Encrypting..." : "Create Record"}
              <Shield className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordModal;