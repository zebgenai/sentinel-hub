import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Youtube, BarChart3, Users, Shield, Zap, ArrowRight, CheckCircle } from 'lucide-react';

export default function Index() {
  const { user } = useAuth();

  const features = [
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Track subscriber growth, views, watch time, and engagement metrics in real-time.',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Manage roles, track contributions, and coordinate with your content team.',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'KYC verification, role-based access control, and complete audit trails.',
    },
  ];

  const benefits = [
    'Real-time channel analytics',
    'Team contribution tracking',
    'Secure dashboard sharing',
    'Community forums',
    'Task management',
    'Multi-language support',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">CreatorHub</span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <Button asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <Zap className="h-4 w-4" />
          <span>Enterprise-grade YouTube analytics</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
          Scale your YouTube channel with{' '}
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            data-driven insights
          </span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Track performance, manage teams, and grow your audience with our comprehensive
          creator management platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="h-12 px-8 text-base" asChild>
            <Link to="/auth">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base">
            Watch Demo
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to grow</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools designed for serious content creators and their teams.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1"
            >
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Built for creators who mean business
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Whether you're a solo creator or managing a team, CreatorHub scales with your needs.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-border flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Analytics Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="relative rounded-3xl bg-gradient-to-r from-primary to-purple-600 p-12 md:p-16 text-center overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to scale your channel?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              Join thousands of creators already using CreatorHub to grow their audience.
            </p>
            <Button size="lg" variant="secondary" className="h-12 px-8" asChild>
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Youtube className="h-6 w-6 text-primary" />
              <span className="font-semibold">CreatorHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 CreatorHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
