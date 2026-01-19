import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare,
  Plus,
  Search,
  TrendingUp,
  Users,
  Video,
  HelpCircle,
  ThumbsUp,
  MessageCircle,
  Eye,
  Loader2,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  author_id: string;
  category_id: string;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  category?: Category;
}

const iconMap: Record<string, React.ElementType> = {
  MessageSquare,
  Video,
  TrendingUp,
  HelpCircle,
  Users,
};

export default function Community() {
  const { profile, isApproved } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newDiscussionOpen, setNewDiscussionOpen] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({ title: '', content: '', categoryId: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: categoriesData } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (categoriesData) setCategories(categoriesData);

    const { data: discussionsData } = await supabase
      .from('discussions')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (discussionsData) setDiscussions(discussionsData);

    setLoading(false);
  };

  const handleCreateDiscussion = async () => {
    if (!profile || !newDiscussion.title || !newDiscussion.content || !newDiscussion.categoryId) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in all fields.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('discussions').insert({
        title: newDiscussion.title,
        content: newDiscussion.content,
        category_id: newDiscussion.categoryId,
        author_id: profile.id,
      });

      if (error) throw error;

      toast({
        title: 'Discussion Created',
        description: 'Your discussion has been posted.',
      });

      setNewDiscussionOpen(false);
      setNewDiscussion({ title: '', content: '', categoryId: '' });
      fetchData();
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

  const filteredDiscussions = discussions.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || d.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryById = (id: string) => categories.find((c) => c.id === id);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Community</h1>
            <p className="text-muted-foreground mt-1">
              Connect, discuss, and learn with fellow creators
            </p>
          </div>
          <Dialog open={newDiscussionOpen} onOpenChange={setNewDiscussionOpen}>
            <DialogTrigger asChild>
              <Button disabled={!isApproved}>
                <Plus className="mr-2 h-4 w-4" />
                New Discussion
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Start a Discussion</DialogTitle>
                <DialogDescription>
                  Share your thoughts, ask questions, or start a conversation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Button
                        key={cat.id}
                        variant={newDiscussion.categoryId === cat.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setNewDiscussion({ ...newDiscussion, categoryId: cat.id })
                        }
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="What's your discussion about?"
                    value={newDiscussion.title}
                    onChange={(e) =>
                      setNewDiscussion({ ...newDiscussion, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Share more details..."
                    rows={5}
                    value={newDiscussion.content}
                    onChange={(e) =>
                      setNewDiscussion({ ...newDiscussion, content: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewDiscussionOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDiscussion} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Post Discussion
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories */}
        <div className="grid gap-4 md:grid-cols-5">
          {categories.map((category) => {
            const IconComponent = iconMap[category.icon || 'MessageSquare'] || MessageSquare;
            const isSelected = selectedCategory === category.id;
            return (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  isSelected ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedCategory(isSelected ? null : category.id)}
              >
                <CardContent className="p-4 text-center">
                  <div className={`h-10 w-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                    isSelected ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    <IconComponent className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <p className="text-sm font-medium">{category.name}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Discussions */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredDiscussions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No discussions yet</h3>
                <p className="text-muted-foreground mb-4">Be the first to start a conversation!</p>
                {isApproved && (
                  <Button onClick={() => setNewDiscussionOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Start Discussion
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredDiscussions.map((discussion) => {
              const category = getCategoryById(discussion.category_id);
              return (
                <Card key={discussion.id} className="hover:border-primary/20 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {discussion.author_id.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {discussion.is_pinned && (
                            <Badge variant="secondary" className="text-xs">Pinned</Badge>
                          )}
                          {category && (
                            <Badge variant="outline" className="text-xs">{category.name}</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                          {discussion.title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                          {discussion.content}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {discussion.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            0 replies
                          </span>
                          <span>
                            {new Date(discussion.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
