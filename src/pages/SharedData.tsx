import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Heart, Stethoscope, Leaf, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SharedData = () => {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<any[]>([]);
  const [shareInfo, setShareInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSharedData = async () => {
      try {
        const dataParam = searchParams.get('data');
        if (!dataParam) {
          throw new Error("No shared data found");
        }

        const shareData = JSON.parse(atob(dataParam));
        setShareInfo(shareData);

        // Check if link is still valid (24 hours)
        const sharedAt = new Date(shareData.sharedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - sharedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          throw new Error("This sharing link has expired");
        }

        // Fetch records (public access for shared data)
        const recordIds = shareData.records.split(',');
        const { data, error } = await supabase
          .from('health_records')
          .select('id, record_type, patient_name, location, created_at, verification_status')
          .in('id', recordIds);

        if (error) throw error;
        setRecords(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSharedData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <p>Loading shared health data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Error</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <nav className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            OneHealth Shield - Shared Data
          </span>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Shared Health Records</h1>
          <p className="text-muted-foreground mb-4">
            Shared by: {shareInfo?.sharedBy} | Access: {shareInfo?.accessType}
          </p>
          <Badge variant="secondary">
            {records.length} record(s) shared
          </Badge>
        </div>

        <div className="grid gap-6">
          {records.map((record) => (
            <Card key={record.id} className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    {record.record_type === "human" && <Heart className="h-5 w-5 text-red-500" />}
                    {record.record_type === "animal" && <Stethoscope className="h-5 w-5 text-blue-500" />}
                    {record.record_type === "environmental" && <Leaf className="h-5 w-5 text-green-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold capitalize">{record.record_type} Health Record</h3>
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
                    <p className="text-sm text-muted-foreground mb-1">
                      Patient/Subject: {record.patient_name}
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">
                      Location: {record.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(record.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-accent-light rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">Privacy Notice</span>
          </div>
          <p className="text-xs text-muted-foreground">
            This is a read-only view of shared health records. Sensitive medical details are not displayed for privacy protection. Access expires 24 hours after sharing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharedData;