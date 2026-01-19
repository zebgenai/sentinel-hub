import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/charts/StatCard';
import { AreaChartComponent } from '@/components/charts/AreaChartComponent';
import { BarChartComponent } from '@/components/charts/BarChartComponent';
import { PieChartComponent } from '@/components/charts/PieChartComponent';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Eye, Clock, Video, TrendingUp, Globe } from 'lucide-react';

// Mock data
const subscriberGrowth = [
  { date: 'Jan', subscribers: 12500, views: 85000 },
  { date: 'Feb', subscribers: 14200, views: 92000 },
  { date: 'Mar', subscribers: 15800, views: 118000 },
  { date: 'Apr', subscribers: 18200, views: 145000 },
  { date: 'May', subscribers: 21500, views: 168000 },
  { date: 'Jun', subscribers: 24800, views: 195000 },
  { date: 'Jul', subscribers: 27200, views: 210000 },
  { date: 'Aug', subscribers: 31500, views: 245000 },
];

const uploadFrequency = [
  { week: 'W1', uploads: 3 },
  { week: 'W2', uploads: 4 },
  { week: 'W3', uploads: 2 },
  { week: 'W4', uploads: 5 },
  { week: 'W5', uploads: 3 },
  { week: 'W6', uploads: 4 },
  { week: 'W7', uploads: 6 },
  { week: 'W8', uploads: 4 },
];

const languageDistribution = [
  { name: 'English', value: 45 },
  { name: 'Spanish', value: 20 },
  { name: 'Hindi', value: 15 },
  { name: 'Portuguese', value: 12 },
  { name: 'Other', value: 8 },
];

const roleContributions = [
  { name: 'Owner', value: 35 },
  { name: 'Editor', value: 25 },
  { name: 'Script Writer', value: 20 },
  { name: 'Thumbnail', value: 15 },
  { name: 'Voice Over', value: 5 },
];

const watchTimeData = [
  { date: 'Mon', hours: 1200 },
  { date: 'Tue', hours: 1450 },
  { date: 'Wed', hours: 1380 },
  { date: 'Thu', hours: 1620 },
  { date: 'Fri', hours: 1890 },
  { date: 'Sat', hours: 2100 },
  { date: 'Sun', hours: 1950 },
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('30d');

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
            <Button variant="outline">Export</Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Subscribers"
            value="31.5K"
            change={{ value: 26.4, isPositive: true }}
            icon={Users}
          />
          <StatCard
            title="Total Views"
            value="1.26M"
            change={{ value: 18.2, isPositive: true }}
            icon={Eye}
          />
          <StatCard
            title="Watch Time"
            value="52.4K hrs"
            change={{ value: 22.8, isPositive: true }}
            icon={Clock}
          />
          <StatCard
            title="Avg. View Duration"
            value="8:24"
            change={{ value: 5.1, isPositive: true }}
            icon={TrendingUp}
          />
        </div>

        {/* Main Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <AreaChartComponent
                title="Subscriber Growth"
                description="Track your subscriber count over time"
                data={subscriberGrowth}
                dataKey="subscribers"
                xAxisKey="date"
                formatValue={(v) => `${(v / 1000).toFixed(1)}K`}
              />
              <AreaChartComponent
                title="Views Trend"
                description="Total views accumulated over time"
                data={subscriberGrowth}
                dataKey="views"
                xAxisKey="date"
                color="hsl(var(--chart-2))"
                gradientId="viewsGradient"
                formatValue={(v) => `${(v / 1000).toFixed(0)}K`}
              />
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <AreaChartComponent
                title="Watch Time"
                description="Hours watched per day"
                data={watchTimeData}
                dataKey="hours"
                xAxisKey="date"
                color="hsl(var(--chart-3))"
                gradientId="watchTimeGradient"
              />
              <BarChartComponent
                title="Upload Frequency"
                description="Videos uploaded per week"
                data={uploadFrequency}
                dataKey="uploads"
                xAxisKey="week"
                color="hsl(var(--chart-4))"
              />
            </div>
          </TabsContent>

          <TabsContent value="audience" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <PieChartComponent
                title="Audience by Language"
                description="Content language distribution"
                data={languageDistribution}
              />
              <div className="space-y-4">
                <StatCard
                  title="Countries Reached"
                  value="142"
                  icon={Globe}
                  description="Your content reaches a global audience"
                />
                <StatCard
                  title="Peak Viewing Hours"
                  value="6-9 PM"
                  description="Most of your audience watches in the evening"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <BarChartComponent
                title="Upload Frequency"
                description="Weekly video uploads"
                data={uploadFrequency}
                dataKey="uploads"
                xAxisKey="week"
              />
              <PieChartComponent
                title="Role Contributions"
                description="Team member contributions by role"
                data={roleContributions}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
