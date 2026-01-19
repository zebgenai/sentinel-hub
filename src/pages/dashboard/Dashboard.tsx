import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/charts/StatCard';
import { AreaChartComponent } from '@/components/charts/AreaChartComponent';
import { BarChartComponent } from '@/components/charts/BarChartComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Users, Eye, TrendingUp, Video, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mock data for demonstration
const subscriberData = [
  { date: 'Jan', subscribers: 12500 },
  { date: 'Feb', subscribers: 14200 },
  { date: 'Mar', subscribers: 15800 },
  { date: 'Apr', subscribers: 18200 },
  { date: 'May', subscribers: 21500 },
  { date: 'Jun', subscribers: 24800 },
];

const viewsData = [
  { day: 'Mon', views: 4200 },
  { day: 'Tue', views: 5100 },
  { day: 'Wed', views: 4800 },
  { day: 'Thu', views: 6200 },
  { day: 'Fri', views: 7500 },
  { day: 'Sat', views: 8900 },
  { day: 'Sun', views: 7200 },
];

const recentActivity = [
  { id: 1, action: 'New video uploaded', time: '2 hours ago', type: 'upload' },
  { id: 2, action: 'Channel reached 25K subscribers', time: '5 hours ago', type: 'milestone' },
  { id: 3, action: 'New team member joined', time: '1 day ago', type: 'team' },
  { id: 4, action: 'KYC verification approved', time: '2 days ago', type: 'kyc' },
];

export default function Dashboard() {
  const { profile, isApproved } = useAuth();

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

        {/* KYC Alert */}
        {!isApproved && (
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

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Subscribers"
            value="24,851"
            change={{ value: 12.5, isPositive: true }}
            icon={Users}
          />
          <StatCard
            title="Total Views"
            value="1.2M"
            change={{ value: 8.2, isPositive: true }}
            icon={Eye}
          />
          <StatCard
            title="Watch Time (hrs)"
            value="45,230"
            change={{ value: 15.3, isPositive: true }}
            icon={TrendingUp}
          />
          <StatCard
            title="Videos Published"
            value="142"
            change={{ value: 5.1, isPositive: true }}
            icon={Video}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <AreaChartComponent
            title="Subscriber Growth"
            description="Monthly subscriber growth over time"
            data={subscriberData}
            dataKey="subscribers"
            xAxisKey="date"
            formatValue={(v) => `${(v / 1000).toFixed(1)}K`}
          />
          <BarChartComponent
            title="Daily Views"
            description="Views per day this week"
            data={viewsData}
            dataKey="views"
            xAxisKey="day"
          />
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
            <CardDescription>Your latest channel updates and milestones</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
