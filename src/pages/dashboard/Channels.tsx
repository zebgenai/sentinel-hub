import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/charts/StatCard';
import {
  Youtube,
  Plus,
  Users,
  Eye,
  Video,
  ExternalLink,
  RefreshCw,
  Loader2,
  Calendar,
} from 'lucide-react';

interface Channel {
  id: string;
  channel_url: string;
  channel_name: string | null;
  channel_id: string | null;
  channel_role: string | null;
  channel_niche: string | null;
  channel_creation_date: string | null;
  subscriber_count: number | null;
  view_count: number | null;
  video_count: number | null;
  last_synced_at: string | null;
  created_at: string;
}

const niches = [
  'Gaming',
  'Education',
  'Entertainment',
  'Music',
  'Tech',
  'Lifestyle',
  'Fitness',
  'Cooking',
  'Travel',
  'Business',
  'Other',
];

const roles = [
  'Owner',
  'Manager',
  'Editor',
  'Contributor',
];

export default function Channels() {
  const { profile, isApproved } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({
    url: '',
    role: '',
    niche: '',
    creationDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchChannels();
    }
  }, [profile]);

  const fetchChannels = async () => {
    if (!profile) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (data) setChannels(data);
    setLoading(false);
  };

  const extractChannelId = (url: string): string | null => {
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleAddChannel = async () => {
    if (!profile || !newChannel.url || !newChannel.role || !newChannel.niche) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const channelId = extractChannelId(newChannel.url);
      
      const { error } = await supabase.from('youtube_channels').insert({
        user_id: profile.id,
        channel_url: newChannel.url,
        channel_id: channelId,
        channel_role: newChannel.role,
        channel_niche: newChannel.niche,
        channel_creation_date: newChannel.creationDate || null,
      });

      if (error) throw error;

      toast({
        title: 'Channel Added',
        description: 'Your YouTube channel has been added successfully.',
      });

      setAddDialogOpen(false);
      setNewChannel({ url: '', role: '', niche: '', creationDate: '' });
      fetchChannels();
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

  const formatNumber = (num: number | null) => {
    if (!num) return '—';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const totalSubscribers = channels.reduce((sum, ch) => sum + (ch.subscriber_count || 0), 0);
  const totalViews = channels.reduce((sum, ch) => sum + (ch.view_count || 0), 0);
  const totalVideos = channels.reduce((sum, ch) => sum + (ch.video_count || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Channels</h1>
            <p className="text-muted-foreground mt-1">
              Manage your YouTube channels and track their performance
            </p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!isApproved}>
                <Plus className="mr-2 h-4 w-4" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add YouTube Channel</DialogTitle>
                <DialogDescription>
                  Enter your channel details to start tracking performance.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Channel URL *</Label>
                  <Input
                    placeholder="https://youtube.com/@yourchannel"
                    value={newChannel.url}
                    onChange={(e) => setNewChannel({ ...newChannel, url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Your Role *</Label>
                  <Select
                    value={newChannel.role}
                    onValueChange={(value) => setNewChannel({ ...newChannel, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role.toLowerCase()}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Channel Niche *</Label>
                  <Select
                    value={newChannel.niche}
                    onValueChange={(value) => setNewChannel({ ...newChannel, niche: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select niche" />
                    </SelectTrigger>
                    <SelectContent>
                      {niches.map((niche) => (
                        <SelectItem key={niche} value={niche.toLowerCase()}>
                          {niche}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Channel Creation Date</Label>
                  <Input
                    type="date"
                    value={newChannel.creationDate}
                    onChange={(e) =>
                      setNewChannel({ ...newChannel, creationDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddChannel} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Channel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        {channels.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Subscribers"
              value={formatNumber(totalSubscribers)}
              icon={Users}
            />
            <StatCard
              title="Total Views"
              value={formatNumber(totalViews)}
              icon={Eye}
            />
            <StatCard
              title="Total Videos"
              value={formatNumber(totalVideos)}
              icon={Video}
            />
          </div>
        )}

        {/* Channels List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : channels.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Youtube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No channels yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your YouTube channel to start tracking performance.
              </p>
              {isApproved && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Channel
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {channels.map((channel) => (
              <Card key={channel.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Youtube className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {channel.channel_name || 'Unnamed Channel'}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="capitalize text-xs">
                            {channel.channel_role || 'Unknown'}
                          </Badge>
                          <Badge variant="outline" className="capitalize text-xs">
                            {channel.channel_niche || 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={channel.channel_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 py-4 border-t border-border">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatNumber(channel.subscriber_count)}</p>
                      <p className="text-xs text-muted-foreground">Subscribers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatNumber(channel.view_count)}</p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatNumber(channel.video_count)}</p>
                      <p className="text-xs text-muted-foreground">Videos</p>
                    </div>
                  </div>
                  {channel.channel_creation_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t border-border">
                      <Calendar className="h-4 w-4" />
                      <span>Created {new Date(channel.channel_creation_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
