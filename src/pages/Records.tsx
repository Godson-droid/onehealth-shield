import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  Heart, 
  Stethoscope, 
  Leaf, 
  Search,
  Eye,
  Download,
  Share2,
  CheckCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  FileText,
  Database,
  Lock,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface HealthRecord {
  id: string;
  record_type: string;
  patient_name: string;
  location: string;
  description: string;
  verification_status: string;
  blockchain_hash: string | null;
  transaction_id: string | null;
  block_number: number | null;
  created_at: string;
  encrypted_data: string;
  is_public: boolean;
}

const Records = () => {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
    };
    
    checkAuth();
    fetchRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, filterType, records]);

  const fetchRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching records:', error);
        toast({
          title: "Error",
          description: "Failed to fetch health records.",
          variant: "destructive",
        });
      } else {
        setRecords(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    if (filterType !== "all") {
      filtered = filtered.filter(record => record.record_type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRecords(filtered);
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case "human": return <Heart className="h-5 w-5 text-red-500" />;
      case "animal": return <Stethoscope className="h-5 w-5 text-blue-500" />;
      case "environmental": return <Leaf className="h-5 w-5 text-green-500" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const handleDownloadRecord = (record: HealthRecord) => {
    const recordData = {
      id: record.id,
      type: record.record_type,
      patient: record.patient_name,
      location: record.location,
      description: record.description,
      status: record.verification_status,
      blockchain_hash: record.blockchain_hash,
      transaction_id: record.transaction_id,
      block_number: record.block_number,
      created_at: record.created_at,
      is_public: record.is_public
    };

    const jsonData = JSON.stringify(recordData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `health-record-${record.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Record Downloaded",
      description: "Health record has been downloaded as JSON file.",
    });
  };

  const handleShareRecord = async (record: HealthRecord) => {
    try {
      const shareData = {
        record_id: record.id,
        shared_at: new Date().toISOString(),
        access_type: 'view-only'
      };
      
      const shareUrl = `${window.location.origin}/shared-data?record=${btoa(JSON.stringify(shareData))}`;
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: "Share Link Generated",
        description: "Secure sharing link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Sharing Failed",
        description: "Unable to generate share link.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading health records...</p>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
            <Button variant="ghost" onClick={async () => {
              await supabase.auth.signOut();
              navigate('/');
            }}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Health Records</h1>
          <p className="text-muted-foreground">
            Manage and view your encrypted health records with blockchain verification
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records by name, location, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
            >
              All Records
            </Button>
            <Button 
              variant={filterType === "human" ? "default" : "outline"}
              onClick={() => setFilterType("human")}
            >
              <Heart className="h-4 w-4 mr-2" />
              Human
            </Button>
            <Button 
              variant={filterType === "animal" ? "default" : "outline"}
              onClick={() => setFilterType("animal")}
            >
              <Stethoscope className="h-4 w-4 mr-2" />
              Animal
            </Button>
            <Button 
              variant={filterType === "environmental" ? "default" : "outline"}
              onClick={() => setFilterType("environmental")}
            >
              <Leaf className="h-4 w-4 mr-2" />
              Environmental
            </Button>
          </div>
        </div>

        {/* Records Grid */}
        {filteredRecords.length === 0 ? (
          <Card className="shadow-card bg-gradient-card border-0 text-center py-12">
            <CardContent>
              <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Records Found</h3>
              <p className="text-muted-foreground mb-4">
                {records.length === 0 
                  ? "You haven't created any health records yet."
                  : "No records match your current search or filter criteria."
                }
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Record
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredRecords.map((record) => (
              <Card key={record.id} className="shadow-card bg-gradient-card border-0 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getRecordIcon(record.record_type)}
                      <div>
                        <CardTitle className="text-lg capitalize">
                          {record.record_type} Health
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {record.patient_name.split(' - ')[1] || record.patient_name}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={record.verification_status === "verified" ? "default" : "secondary"} className="text-xs">
                      {record.verification_status === "verified" ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{record.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(record.created_at).toLocaleDateString()}</span>
                    </div>
                    {record.blockchain_hash && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-xs truncate">
                          {record.blockchain_hash.substring(0, 12)}...
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {record.description}
                  </p>

                  <div className="flex items-center space-x-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-2">
                            {getRecordIcon(record.record_type)}
                            <span>Health Record Details</span>
                          </DialogTitle>
                          <DialogDescription>
                            Complete information for this health record
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* Basic Information */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Record Type</label>
                              <p className="text-sm text-muted-foreground capitalize">{record.record_type}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Patient/Subject</label>
                              <p className="text-sm text-muted-foreground">{record.patient_name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Location</label>
                              <p className="text-sm text-muted-foreground">{record.location}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Created Date</label>
                              <p className="text-sm text-muted-foreground">
                                {new Date(record.created_at).toLocaleDateString('en-NG', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-lg">
                              {record.description}
                            </p>
                          </div>

                          {/* Blockchain Information */}
                          <div className="bg-accent/10 p-4 rounded-lg">
                            <h4 className="font-medium mb-3 flex items-center space-x-2">
                              <Lock className="h-4 w-4" />
                              <span>Security & Verification</span>
                            </h4>
                            <div className="grid grid-cols-1 gap-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Verification Status</span>
                                <Badge variant={record.verification_status === "verified" ? "default" : "secondary"}>
                                  {record.verification_status === "verified" ? (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Blockchain Verified
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Pending Verification
                                    </>
                                  )}
                                </Badge>
                              </div>
                              {record.blockchain_hash && (
                                <div>
                                  <span className="text-sm font-medium">Blockchain Hash</span>
                                  <p className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">
                                    {record.blockchain_hash}
                                  </p>
                                </div>
                              )}
                              {record.transaction_id && (
                                <div>
                                  <span className="text-sm font-medium">Transaction ID</span>
                                  <p className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">
                                    {record.transaction_id}
                                  </p>
                                </div>
                              )}
                              {record.block_number && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Block Number</span>
                                  <span className="text-sm font-mono">#{record.block_number}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Privacy Level</span>
                                <Badge variant="outline">
                                  {record.is_public ? "Public" : "Private"}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDownloadRecord(record)}
                              className="flex-1"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleShareRecord(record)}
                              className="flex-1"
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDownloadRecord(record)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleShareRecord(record)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Records;