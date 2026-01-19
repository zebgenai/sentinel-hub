import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  FileCheck,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  Camera,
  CreditCard,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type DocumentType = 'national_id' | 'passport' | 'live_photo' | 'live_video';

interface UploadedDoc {
  type: DocumentType;
  fileName: string;
  uploadedAt: Date;
}

const documentRequirements = [
  {
    type: 'national_id' as DocumentType,
    label: 'National ID or Passport',
    description: 'Upload a clear photo of your government-issued ID',
    icon: CreditCard,
    accept: 'image/*',
  },
  {
    type: 'live_photo' as DocumentType,
    label: 'Live Photo',
    description: 'Take a selfie holding your ID document',
    icon: Camera,
    accept: 'image/*',
  },
];

export default function KYC() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const getStateInfo = () => {
    switch (profile?.state) {
      case 'APPROVED':
        return {
          icon: CheckCircle,
          color: 'text-success',
          bgColor: 'bg-success/10',
          title: 'Verification Approved',
          description: 'Your account has been verified. You have full access to all features.',
        };
      case 'REJECTED':
        return {
          icon: XCircle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          title: 'Verification Rejected',
          description: 'Your verification was rejected. Please resubmit your documents.',
        };
      case 'KYC_SUBMITTED':
        return {
          icon: Clock,
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          title: 'Under Review',
          description: 'Your documents are being reviewed. This usually takes 1-2 business days.',
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          title: 'Verification Required',
          description: 'Please upload the required documents to verify your identity.',
        };
    }
  };

  const stateInfo = getStateInfo();
  const progress = (uploadedDocs.length / documentRequirements.length) * 100;

  const handleFileUpload = async (type: DocumentType, file: File) => {
    if (!profile) return;

    setUploading(type);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('kyc_documents').insert({
        user_id: profile.id,
        document_type: type,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
      });

      if (dbError) throw dbError;

      setUploadedDocs([...uploadedDocs, { type, fileName: file.name, uploadedAt: new Date() }]);
      
      toast({
        title: 'Document Uploaded',
        description: `${file.name} has been uploaded successfully.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message,
      });
    } finally {
      setUploading(null);
    }
  };

  const handleSubmitKYC = async () => {
    if (!profile) return;
    
    setSubmitting(true);
    
    try {
      const { error } = await supabase.from('kyc_verifications').insert({
        user_id: profile.id,
        decision: 'pending_review',
      });

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ state: 'KYC_SUBMITTED' })
        .eq('id', profile.id);

      await refreshProfile();

      toast({
        title: 'KYC Submitted',
        description: 'Your verification documents have been submitted for review.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isDocUploaded = (type: DocumentType) => uploadedDocs.some((doc) => doc.type === type);
  const canSubmit = uploadedDocs.length === documentRequirements.length;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KYC Verification</h1>
          <p className="text-muted-foreground mt-1">
            Verify your identity to unlock all platform features
          </p>
        </div>

        {/* Status Card */}
        <Card className={stateInfo.bgColor}>
          <CardContent className="flex items-center gap-4 py-6">
            <div className={`h-12 w-12 rounded-full ${stateInfo.bgColor} flex items-center justify-center`}>
              <stateInfo.icon className={`h-6 w-6 ${stateInfo.color}`} />
            </div>
            <div>
              <h3 className="font-semibold">{stateInfo.title}</h3>
              <p className="text-sm text-muted-foreground">{stateInfo.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        {(profile?.state === 'REGISTERED' || profile?.state === 'REJECTED') && (
          <>
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Upload Progress</span>
                <span className="font-medium">{uploadedDocs.length}/{documentRequirements.length} documents</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Document Upload Cards */}
            <div className="space-y-4">
              {documentRequirements.map((doc) => {
                const isUploaded = isDocUploaded(doc.type);
                const isCurrentlyUploading = uploading === doc.type;
                
                return (
                  <Card key={doc.type} className={isUploaded ? 'border-success/50 bg-success/5' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            isUploaded ? 'bg-success/10' : 'bg-muted'
                          }`}>
                            {isUploaded ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : (
                              <doc.icon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base">{doc.label}</CardTitle>
                            <CardDescription>{doc.description}</CardDescription>
                          </div>
                        </div>
                        {isUploaded && (
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            Uploaded
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    {!isUploaded && (
                      <CardContent>
                        <Label htmlFor={doc.type} className="cursor-pointer">
                          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                            {isCurrentlyUploading ? (
                              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                            ) : (
                              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            )}
                            <p className="text-sm font-medium">
                              {isCurrentlyUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PNG, JPG up to 10MB
                            </p>
                          </div>
                          <Input
                            id={doc.type}
                            type="file"
                            accept={doc.accept}
                            className="hidden"
                            disabled={isCurrentlyUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(doc.type, file);
                            }}
                          />
                        </Label>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Submit Button */}
            <Button
              size="lg"
              className="w-full"
              disabled={!canSubmit || submitting}
              onClick={handleSubmitKYC}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FileCheck className="mr-2 h-4 w-4" />
              Submit for Verification
            </Button>
          </>
        )}

        {/* Timeline for submitted/approved states */}
        {(profile?.state === 'KYC_SUBMITTED' || profile?.state === 'APPROVED') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verification Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Documents Submitted</p>
                    <p className="text-xs text-muted-foreground">Your documents have been received</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    profile?.state === 'APPROVED' ? 'bg-success/10' : 'bg-warning/10'
                  }`}>
                    {profile?.state === 'APPROVED' ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <Clock className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {profile?.state === 'APPROVED' ? 'Verification Complete' : 'Under Review'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.state === 'APPROVED' 
                        ? 'Your identity has been verified' 
                        : 'Our team is reviewing your documents'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
