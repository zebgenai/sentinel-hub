import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Users,
  FileCheck,
  Activity,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Ban,
  Eye,
  Loader2,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  state: string;
  created_at: string;
}

interface KYCSubmission {
  id: string;
  user_id: string;
  decision: string;
  created_at: string;
  user: {
    email: string;
    full_name: string | null;
  };
}

interface AuditLog {
  id: number;
  action: string;
  entity_type: string | null;
  details: any;
  created_at: string;
  actor_id: string | null;
}

export default function Admin() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<KYCSubmission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'suspend' | null;
    userId: string | null;
  }>({ open: false, type: null, userId: null });
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (usersData) setUsers(usersData as User[]);

    // Fetch KYC submissions
    const { data: kycData } = await supabase
      .from('kyc_verifications')
      .select(`
        id,
        user_id,
        decision,
        created_at
      `)
      .eq('decision', 'pending_review')
      .order('created_at', { ascending: false });
    
    if (kycData) {
      // Fetch user info for each KYC
      const kycWithUsers = await Promise.all(
        kycData.map(async (kyc) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', kyc.user_id)
            .maybeSingle();
          return {
            ...kyc,
            user: userData || { email: 'Unknown', full_name: null },
          };
        })
      );
      setKycSubmissions(kycWithUsers);
    }

    // Fetch audit logs
    const { data: logsData } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (logsData) setAuditLogs(logsData as AuditLog[]);

    setLoading(false);
  };

  const handleUserAction = async () => {
    if (!actionDialog.userId || !actionDialog.type) return;
    
    setProcessing(true);
    
    try {
      let newState: 'APPROVED' | 'REJECTED' | 'SUSPENDED';
      switch (actionDialog.type) {
        case 'approve':
          newState = 'APPROVED';
          break;
        case 'reject':
          newState = 'REJECTED';
          break;
        case 'suspend':
          newState = 'SUSPENDED';
          break;
        default:
          return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ state: newState })
        .eq('id', actionDialog.userId);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        action: `user_${actionDialog.type}`,
        entity_type: 'user',
        entity_id: actionDialog.userId,
        details: { reason: actionReason },
      });

      toast({
        title: 'Action Completed',
        description: `User has been ${actionDialog.type}ed successfully.`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message,
      });
    } finally {
      setProcessing(false);
      setActionDialog({ open: false, type: null, userId: null });
      setActionReason('');
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStateBadge = (state: string) => {
    const styles: Record<string, string> = {
      APPROVED: 'bg-success/10 text-success',
      REJECTED: 'bg-destructive/10 text-destructive',
      SUSPENDED: 'bg-destructive/10 text-destructive',
      KYC_SUBMITTED: 'bg-warning/10 text-warning',
      REGISTERED: 'bg-muted text-muted-foreground',
    };
    return styles[state] || styles.REGISTERED;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, review KYC submissions, and monitor system activity
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kycSubmissions.length}</p>
                <p className="text-sm text-muted-foreground">Pending KYC</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{auditLogs.length}</p>
                <p className="text-sm text-muted-foreground">Recent Actions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="kyc">KYC Reviews</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>{user.email[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStateBadge(user.state)}>
                            {user.state.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {user.state !== 'APPROVED' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setActionDialog({ open: true, type: 'approve', userId: user.id })
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {user.state !== 'REJECTED' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setActionDialog({ open: true, type: 'reject', userId: user.id })
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              )}
                              {user.state !== 'SUSPENDED' && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() =>
                                    setActionDialog({ open: true, type: 'suspend', userId: user.id })
                                  }
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="kyc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending KYC Reviews</CardTitle>
                <CardDescription>Review and approve user verification documents</CardDescription>
              </CardHeader>
              <CardContent>
                {kycSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending KYC submissions
                  </div>
                ) : (
                  <div className="space-y-4">
                    {kycSubmissions.map((kyc) => (
                      <div
                        key={kyc.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                            <FileCheck className="h-5 w-5 text-warning" />
                          </div>
                          <div>
                            <p className="font-medium">{kyc.user.full_name || kyc.user.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Submitted {new Date(kyc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setActionDialog({ open: true, type: 'reject', userId: kyc.user_id })
                            }
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              setActionDialog({ open: true, type: 'approve', userId: kyc.user_id })
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity Logs</CardTitle>
                <CardDescription>Recent system actions and events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.entity_type && `${log.entity_type} • `}
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog
          open={actionDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setActionDialog({ open: false, type: null, userId: null });
              setActionReason('');
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="capitalize">
                {actionDialog.type} User
              </DialogTitle>
              <DialogDescription>
                {actionDialog.type === 'approve' &&
                  'This will grant the user full access to the platform.'}
                {actionDialog.type === 'reject' &&
                  'This will reject the user verification. They can resubmit documents.'}
                {actionDialog.type === 'suspend' &&
                  'This will suspend the user account and revoke all access.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  placeholder="Enter a reason for this action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialog({ open: false, type: null, userId: null })}
              >
                Cancel
              </Button>
              <Button
                variant={actionDialog.type === 'suspend' ? 'destructive' : 'default'}
                onClick={handleUserAction}
                disabled={processing}
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
