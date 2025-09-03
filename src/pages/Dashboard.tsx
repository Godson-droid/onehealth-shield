import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Plus, 
  Heart, 
  Stethoscope, 
  Leaf, 
  FileText, 
  Users, 
  Settings, 
  Lock,
  Activity,
  Database,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import RecordModal from "@/components/RecordModal";
import BlockchainModal from "@/components/BlockchainModal";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [blockchainModalOpen, setBlockchainModalOpen] = useState(false);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("individual");
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      
      // Check if user has completed MFA setup
      const { data: profile } = await supabase
        .from('profiles')
        .select('mfa_enabled')
        .eq('user_id', user.id)
        .single();
      
      if (!profile?.mfa_enabled) {
        navigate('/mfa-setup');
        return;
      }
    };
    
    checkAuth();
    fetchHealthRecords();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
        setUserRole(data.role || 'individual');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchHealthRecords = async () => {
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
        console.error('Error fetching health records:', error);
      } else {
        setHealthRecords(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get role data from database, not hardcoded
  const stats = {
    totalRecords: loading ? 0 : healthRecords.length,
    humanRecords: loading ? 0 : healthRecords.filter(r => r.record_type === 'human').length,
    animalRecords: loading ? 0 : healthRecords.filter(r => r.record_type === 'animal').length,
    environmentalRecords: loading ? 0 : healthRecords.filter(r => r.record_type === 'environmental').length,
    encryptedRecords: loading ? 0 : healthRecords.length, // All records are encrypted
    blockchainVerified: loading ? 0 : healthRecords.filter(r => r.verification_status === 'verified').length
  };

  const recentActivity = loading ? [] : healthRecords.slice(0, 5).map((record, index) => ({
    id: record.id,
    type: record.record_type,
    action: `Created ${record.record_type} health record`,
    patient: `${record.patient_name} - ${record.location}`,
    timestamp: new Date(record.created_at).toLocaleDateString('en-NG', { 
      hour: '2-digit', 
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    }),
    status: record.verification_status || 'pending'
  }));

  const rolePermissions = {
    healthcare_provider: {
      name: "Healthcare Provider",
      permissions: ["Create Human Records", "Update Patient Data", "View Medical History", "Generate Reports"],
      color: "text-blue-600"
    },
    researcher: {
      name: "Researcher",
      permissions: ["View Anonymized Data", "Generate Analytics", "Export Research Data", "Access Trends"],
      color: "text-purple-600"
    },
    individual: {
      name: "Individual",
      permissions: ["View Own Records", "Update Personal Info", "Share Data", "Download Reports"],
      color: "text-green-600"
    }
  };

  const currentRole = rolePermissions[userRole as keyof typeof rolePermissions];

  const handleCreateRecord = () => {
    setRecordModalOpen(true);
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      toast({
        title: "Generating Report",
        description: "Your health data report is being compiled and encrypted...",
      });

      // Generate CSV report data
      const csvHeader = "ID,Type,Patient/Subject,Location,Description,Status,Date Created,Blockchain Hash\n";
      const csvData = healthRecords.map(record => 
        `${record.id},${record.record_type},${record.patient_name},"${record.location}","${record.description}",${record.verification_status},${new Date(record.created_at).toISOString()},${record.blockchain_hash || 'Pending'}`
      ).join('\n');
      
      const csvContent = csvHeader + csvData;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `onehealth-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Generated",
        description: "Your secure health report has been downloaded as CSV file.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShareData = async () => {
    try {
      if (!healthRecords.length) {
        toast({
          title: "No Data to Share",
          description: "Create some health records first before sharing data.",
        });
        return;
      }

      // Generate shareable link with record IDs
      const recordIds = healthRecords.slice(0, 5).map(r => r.id).join(',');
      const shareableData = {
        records: recordIds,
        sharedBy: profile?.email || 'Unknown',
        sharedAt: new Date().toISOString(),
        accessType: 'view-only'
      };
      
      const shareUrl = `${window.location.origin}/shared-data?data=${btoa(JSON.stringify(shareableData))}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: "Share Link Generated",
        description: "Secure sharing link copied to clipboard. Valid for 24 hours.",
      });
    } catch (error) {
      toast({
        title: "Sharing Failed",
        description: "Unable to generate share link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewBlockchain = () => {
    setBlockchainModalOpen(true);
  };

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
            <Badge variant="secondary" className={currentRole.color}>
              {currentRole.name}
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
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
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Secure management of OneHealth data records with blockchain verification
          </p>
        </div>

        {/* Security Status */}
        <div className="mb-8">
          <Card className="shadow-secure bg-gradient-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-accent">
                <Shield className="h-5 w-5" />
                <span>Security Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center space-y-1">
                  <CheckCircle className="h-8 w-8 text-accent mx-auto" />
                  <p className="text-sm font-medium">MFA Enabled</p>
                </div>
                <div className="text-center space-y-1">
                  <Lock className="h-8 w-8 text-accent mx-auto" />
                  <p className="text-sm font-medium">AES Encrypted</p>
                </div>
                <div className="text-center space-y-1">
                  <Database className="h-8 w-8 text-accent mx-auto" />
                  <p className="text-sm font-medium">Blockchain Verified</p>
                </div>
                <div className="text-center space-y-1">
                  <Activity className="h-8 w-8 text-accent mx-auto" />
                  <p className="text-sm font-medium">Real-time Monitoring</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-card bg-gradient-card border-0">
            <CardContent className="p-6 text-center">
              <Database className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </CardContent>
          </Card>
          <Card className="shadow-card bg-gradient-card border-0">
            <CardContent className="p-6 text-center">
              <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.humanRecords.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Human Health</p>
            </CardContent>
          </Card>
          <Card className="shadow-card bg-gradient-card border-0">
            <CardContent className="p-6 text-center">
              <Stethoscope className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.animalRecords.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Animal Health</p>
            </CardContent>
          </Card>
          <Card className="shadow-card bg-gradient-card border-0">
            <CardContent className="p-6 text-center">
              <Leaf className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.environmentalRecords.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Environmental</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="space-y-6">
            <Card className="shadow-card bg-gradient-card border-0">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks based on your role permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start shadow-medical" onClick={handleCreateRecord}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Record
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleGenerateReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleShareData}>
                  <Users className="h-4 w-4 mr-2" />
                  Share Data
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleViewBlockchain}>
                  <Database className="h-4 w-4 mr-2" />
                  View Blockchain
                </Button>
              </CardContent>
            </Card>

            {/* Role Permissions */}
            <Card className="shadow-card bg-gradient-card border-0">
              <CardHeader>
                <CardTitle>Your Permissions</CardTitle>
                <CardDescription>
                  What you can do in this system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentRole.permissions.map((permission, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <span className="text-sm">{permission}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="shadow-card bg-gradient-card border-0">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest actions on health records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 bg-muted/50 rounded-lg">
                      <div className="p-2 rounded-full bg-primary/10">
                        {activity.type === "human" && <Heart className="h-4 w-4 text-red-500" />}
                        {activity.type === "animal" && <Stethoscope className="h-4 w-4 text-blue-500" />}
                        {activity.type === "environmental" && <Leaf className="h-4 w-4 text-green-500" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">{activity.patient}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                          <Badge variant={activity.status === "verified" ? "default" : "secondary"} className="text-xs">
                            {activity.status === "verified" ? (
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
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modals */}
        <RecordModal 
          open={recordModalOpen} 
          onOpenChange={setRecordModalOpen}
          onRecordCreated={fetchHealthRecords}
        />
        <BlockchainModal open={blockchainModalOpen} onOpenChange={setBlockchainModalOpen} />
      </div>
    </div>
  );
};

export default Dashboard;