import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/charts/StatCard';
import { AreaChartComponent } from '@/components/charts/AreaChartComponent';
import { BarChartComponent } from '@/components/charts/BarChartComponent';
import { PieChartComponent } from '@/components/charts/PieChartComponent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Eye, Clock, Video, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface ChannelData {
  id: string;
  channel_name: string | null;
  subscriber_count: number | null;
  view_count: number | null;
  video_count: number | null;
}

interface SnapshotData {
  [key: string]: string | number;
  date: string;
  subscribers: number;
  views: number;
}

export default function Analytics() {
  const { profile } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([]);
  const [totals, setTotals] = useState({
    subscribers: 0,
    views: 0,
    videos: 0,
  });

  useEffect(() => {
    if (profile) {
      fetchAnalytics();
    }
  }, [profile, timeRange]);

  const fetchAnalytics = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // Fetch channels
      const { data: channelData } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('user_id', profile.id);

      if (channelData) {
        setChannels(channelData);
        setTotals({
          subscribers: channelData.reduce((sum, c) => sum + (c.subscriber_count || 0), 0),
          views: channelData.reduce((sum, c) => sum + (c.view_count || 0), 0),
          videos: channelData.reduce((sum, c) => sum + (c.video_count || 0), 0),
        });

        // Fetch snapshots
        if (channelData.length > 0) {
          const channelIds = channelData.map(c => c.id);
          const { data: snapshotData } = await supabase
            .from('channel_stats_snapshots')
            .select('*')
            .in('channel_id', channelIds)
            .order('snapshot_date', { ascending: true });

          if (snapshotData) {
            setSnapshots(snapshotData.map(s => ({
              date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              subscribers: s.subscriber_count || 0,
              views: s.view_count || 0,
            })));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const channelDistribution = channels.map(c => ({
    name: c.channel_name || 'Unknown',
    value: c.subscriber_count || 0,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Deep insights into your channel performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : channels.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
              <p className="text-muted-foreground mb-4">
                Connect your YouTube channel to start seeing analytics.
              </p>
              <Button asChild>
                <Link to="/dashboard/channels">Add Channel</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Subscribers"
                value={formatNumber(totals.subscribers)}
                icon={Users}
              />
              <StatCard
                title="Total Views"
                value={formatNumber(totals.views)}
                icon={Eye}
              />
              <StatCard
                title="Videos Published"
                value={formatNumber(totals.videos)}
                icon={Video}
              />
              <StatCard
                title="Channels"
                value={channels.length.toString()}
                icon={TrendingUp}
              />
            </div>

            {/* Main Charts */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="channels">Channels</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {snapshots.length > 0 ? (
                    <>
                      <AreaChartComponent
                        title="Subscriber Growth"
                        description="Track your subscriber count over time"
                        data={snapshots}
                        dataKey="subscribers"
                        xAxisKey="date"
                        formatValue={(v) => formatNumber(v)}
                      />
                      <AreaChartComponent
                        title="Views Trend"
                        description="Total views accumulated over time"
                        data={snapshots}
                        dataKey="views"
                        xAxisKey="date"
                        color="hsl(var(--chart-2))"
                        gradientId="viewsGradient"
                        formatValue={(v) => formatNumber(v)}
                      />
                    </>
                  ) : (
                    <Card className="lg:col-span-2">
                      <CardContent className="text-center py-12">
                        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Historical Data Yet</h3>
                        <p className="text-muted-foreground">
                          Analytics data will appear here as we track your channel performance over time.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="channels" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {channelDistribution.length > 0 && (
                    <PieChartComponent
                      title="Subscribers by Channel"
                      description="Distribution of subscribers across your channels"
                      data={channelDistribution}
                    />
                  )}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Channel List</CardTitle>
                      <CardDescription>Your connected YouTube channels</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {channels.map((channel) => (
                          <div key={channel.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div>
                              <p className="font-medium">{channel.channel_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatNumber(channel.subscriber_count || 0)} subscribers
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(channel.view_count || 0)} views
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
