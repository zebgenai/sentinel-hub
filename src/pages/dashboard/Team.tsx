import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PieChartComponent } from '@/components/charts/PieChartComponent';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Plus,
  UserPlus,
  Crown,
  Pencil,
  Video,
  Image,
  Mic,
  Search as SearchIcon,
  Loader2,
  Settings,
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
}

interface TeamMemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

const roleIcons: Record<string, React.ElementType> = {
  owner: Crown,
  script_writer: Pencil,
  editor: Video,
  thumbnail_designer: Image,
  voice_over: Mic,
  researcher: SearchIcon,
  manager: Settings,
};

const roleColors: Record<string, string> = {
  owner: 'bg-yellow-500/10 text-yellow-600',
  script_writer: 'bg-blue-500/10 text-blue-600',
  editor: 'bg-purple-500/10 text-purple-600',
  thumbnail_designer: 'bg-pink-500/10 text-pink-600',
  voice_over: 'bg-green-500/10 text-green-600',
  researcher: 'bg-orange-500/10 text-orange-600',
  manager: 'bg-gray-500/10 text-gray-600',
};

export default function Team() {
  const { profile, isApproved } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMemberWithProfile[]>>({});
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchTeams();
    }
  }, [profile]);

  const fetchTeams = async () => {
    if (!profile) return;
    
    setLoading(true);
    
    // Fetch teams where user is owner or member
    const { data: ownedTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', profile.id);

    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', profile.id);

    let allTeams: Team[] = [];

    if (memberTeams && memberTeams.length > 0) {
      const teamIds = memberTeams.map(m => m.team_id);
      const { data: additionalTeams } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);
      
      allTeams = [...(ownedTeams || []), ...(additionalTeams || [])];
      allTeams = allTeams.filter((team, index, self) =>
        index === self.findIndex(t => t.id === team.id)
      );
    } else {
      allTeams = ownedTeams || [];
    }

    setTeams(allTeams);

    // Fetch members for each team
    const membersMap: Record<string, TeamMemberWithProfile[]> = {};
    for (const team of allTeams) {
      const { data: members } = await supabase
        .from('team_members')
        .select('id, user_id, role')
        .eq('team_id', team.id);

      if (members) {
        const memberIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', memberIds);

        membersMap[team.id] = members.map(m => ({
          ...m,
          profile: profiles?.find(p => p.id === m.user_id),
        }));
      }
    }
    setTeamMembers(membersMap);

    setLoading(false);
  };

  const handleCreateTeam = async () => {
    if (!profile || !newTeam.name) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please enter a team name.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: newTeam.name,
          description: newTeam.description || null,
          owner_id: profile.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add owner as team member
      await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: profile.id,
        role: 'owner',
      });

      toast({
        title: 'Team Created',
        description: 'Your team has been created successfully.',
      });

      setCreateDialogOpen(false);
      setNewTeam({ name: '', description: '' });
      fetchTeams();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate role distribution from actual team members
  const roleDistribution = Object.values(teamMembers)
    .flat()
    .reduce((acc: { name: string; value: number }[], member) => {
      const roleName = member.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
      const existing = acc.find(r => r.name === roleName);
      if (existing) {
        existing.value++;
      } else {
        acc.push({ name: roleName, value: 1 });
      }
      return acc;
    }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team members and track contributions
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!isApproved}>
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a team to collaborate with other creators.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Team Name *</Label>
                  <Input
                    placeholder="Enter team name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description (optional)"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTeam} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Team
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : teams.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a team to start collaborating with others.
              </p>
              {isApproved && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Team
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Teams List */}
            <div className="lg:col-span-2 space-y-4">
              {teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {team.name}
                          {team.owner_id === profile?.id && (
                            <Badge variant="secondary" className="text-xs">Owner</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {team.description || 'No description'}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Team members:</p>
                      <div className="flex -space-x-2">
                        {(teamMembers[team.id] || []).slice(0, 5).map((member) => (
                          <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {member.profile?.full_name?.charAt(0) || member.profile?.email?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(teamMembers[team.id]?.length || 0) > 5 && (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                            +{(teamMembers[team.id]?.length || 0) - 5}
                          </div>
                        )}
                      </div>
                      {(!teamMembers[team.id] || teamMembers[team.id].length === 0) && (
                        <span className="text-sm text-muted-foreground">No members yet</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Role Distribution */}
            <div>
              {roleDistribution.length > 0 ? (
                <PieChartComponent
                  title="Role Distribution"
                  description="Team composition by role"
                  data={roleDistribution}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Role Distribution</CardTitle>
                    <CardDescription>Team composition by role</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No data yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Contribution Roles Legend */}
        {teams.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contribution Roles</CardTitle>
              <CardDescription>Available roles for team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(roleIcons).map(([role, Icon]) => (
                  <div key={role} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${roleColors[role] || 'bg-muted'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium capitalize text-center">
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
