import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/charts/StatCard';
import { AreaChartComponent } from '@/components/charts/AreaChartComponent';
import { BarChartComponent } from '@/components/charts/BarChartComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Users, Eye, TrendingUp, Video, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ChannelStats {
  totalSubscribers: number;
  totalViews: number;
  totalVideos: number;
  subscriberGrowth: { date: string; subscribers: number }[];
}

interface Activity {
  id: string;
  action: string;
  time: string;
  type: string;
}

export default function Dashboard() {
  const { profile, isApproved, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChannelStats>({
    totalSubscribers: 0,
    totalViews: 0,
    totalVideos: 0,
    subscriberGrowth: [],
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // Fetch user's channels
      const { data: channels } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('user_id', profile.id);

      if (channels && channels.length > 0) {
        const totalSubscribers = channels.reduce((sum, c) => sum + (c.subscriber_count || 0), 0);
        const totalViews = channels.reduce((sum, c) => sum + (c.view_count || 0), 0);
        const totalVideos = channels.reduce((sum, c) => sum + (c.video_count || 0), 0);

        // Fetch snapshots for subscriber growth
        const channelIds = channels.map(c => c.id);
        const { data: snapshots } = await supabase
          .from('channel_stats_snapshots')
          .select('*')
          .in('channel_id', channelIds)
          .order('snapshot_date', { ascending: true });

        const subscriberGrowth = snapshots?.map(s => ({
          date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short' }),
          subscribers: s.subscriber_count || 0,
        })) || [];

        setStats({
          totalSubscribers,
          totalViews,
          totalVideos,
          subscriberGrowth,
        });
      }

      // Fetch recent audit logs as activity
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (logs) {
        setRecentActivity(logs.map(log => ({
          id: log.id.toString(),
          action: log.action,
          time: getRelativeTime(new Date(log.created_at)),
          type: log.entity_type || 'action',
        })));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Creator'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your channels today.
          </p>
        </div>

        {/* KYC Alert - Not shown for admins */}
        {!isApproved && !isAdmin && (
          <Alert variant="destructive" className="bg-warning/10 border-warning text-warning-foreground">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Complete Your Verification</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Complete your KYC verification to unlock all features.</span>
              <Button variant="outline" size="sm" asChild className="ml-4">
                <Link to="/dashboard/kyc">
                  Complete KYC
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Subscribers"
                value={formatNumber(stats.totalSubscribers)}
                icon={Users}
              />
              <StatCard
                title="Total Views"
                value={formatNumber(stats.totalViews)}
                icon={Eye}
              />
              <StatCard
                title="Videos Published"
                value={formatNumber(stats.totalVideos)}
                icon={Video}
              />
              <StatCard
                title="Channels"
                value={stats.subscriberGrowth.length > 0 ? 'Active' : '0'}
                icon={TrendingUp}
              />
            </div>

            {/* Charts */}
            {stats.subscriberGrowth.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                <AreaChartComponent
                  title="Subscriber Growth"
                  description="Monthly subscriber growth over time"
                  data={stats.subscriberGrowth}
                  dataKey="subscribers"
                  xAxisKey="date"
                  formatValue={(v) => formatNumber(v)}
                />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-medium">Get Started</CardTitle>
                    <CardDescription>Connect your YouTube channel to see more insights</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild>
                      <Link to="/dashboard/channels">
                        <Video className="mr-2 h-4 w-4" />
                        Manage Channels
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Channels Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect your YouTube channel to start tracking your analytics.
                  </p>
                  <Button asChild>
                    <Link to="/dashboard/channels">
                      Add Your First Channel
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                <CardDescription>Your latest channel updates and actions</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between py-3 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <div>
                            <p className="text-sm font-medium">{activity.action}</p>
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {activity.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
