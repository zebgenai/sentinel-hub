-- =============================================
-- HELPER FUNCTION FOR TIMESTAMPS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- CONTRIBUTION TRACKING SYSTEM
-- =============================================

-- Contribution roles enum
CREATE TYPE public.contribution_role AS ENUM ('owner', 'script_writer', 'editor', 'thumbnail_designer', 'voice_over', 'researcher', 'manager');

-- Teams table for group projects
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team members junction table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role contribution_role NOT NULL DEFAULT 'owner',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Projects for tracking contributions
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES public.youtube_channels(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contributions table
CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role contribution_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'reviewed')),
  performance_score DECIMAL(3,2) CHECK (performance_score >= 0 AND performance_score <= 5),
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- COMMUNITY SYSTEM
-- =============================================

-- Categories for organizing discussions
CREATE TABLE public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discussion threads
CREATE TABLE public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Threaded replies
CREATE TABLE public.discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_solution BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Media attachments for discussions
CREATE TABLE public.discussion_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID REFERENCES public.discussions(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attachment_parent CHECK (discussion_id IS NOT NULL OR reply_id IS NOT NULL)
);

-- Reactions for discussions and replies
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  discussion_id UUID REFERENCES public.discussions(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'helpful', 'insightful', 'celebrate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reaction_target CHECK (discussion_id IS NOT NULL OR reply_id IS NOT NULL)
);

-- Unique constraint for reactions (handled separately to allow partial uniqueness)
CREATE UNIQUE INDEX unique_user_discussion_reaction ON public.reactions (user_id, discussion_id, reaction_type) WHERE discussion_id IS NOT NULL;
CREATE UNIQUE INDEX unique_user_reply_reaction ON public.reactions (user_id, reply_id, reaction_type) WHERE reply_id IS NOT NULL;

-- =============================================
-- DASHBOARD SHARING SYSTEM
-- =============================================

-- Shareable dashboard links
CREATE TABLE public.shared_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  channel_id UUID REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{"subscribers": true, "views": true, "watchTime": false, "revenue": false}'::jsonb,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  view_count INT NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT share_target CHECK (channel_id IS NOT NULL OR team_id IS NOT NULL)
);

-- =============================================
-- FUTURE-PROOFING TABLES
-- =============================================

-- Gamification: Achievements and badges
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  category TEXT NOT NULL CHECK (category IN ('contribution', 'community', 'milestone', 'special')),
  points INT NOT NULL DEFAULT 0,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Notifications system
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'mention', 'reply', 'achievement', 'kyc', 'team', 'channel')),
  title TEXT NOT NULL,
  content TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task management
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User preferences for i18n and settings
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate limiting table
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Teams policies
CREATE POLICY "Users can view teams they belong to" ON public.teams
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_approved(auth.uid()));

CREATE POLICY "Team owners can update" ON public.teams
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete" ON public.teams
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Team members policies
CREATE POLICY "View team members" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Team owners can add members" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Team owners can remove members" ON public.team_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- Projects policies
CREATE POLICY "View own or team projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = projects.team_id AND user_id = auth.uid())
  );

CREATE POLICY "Create projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_approved(auth.uid()));

CREATE POLICY "Update own projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- Contributions policies
CREATE POLICY "View contributions" ON public.contributions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.projects p 
      JOIN public.team_members tm ON tm.team_id = p.team_id 
      WHERE p.id = project_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners manage contributions" ON public.contributions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by = auth.uid())
  );

-- Forum categories - public read
CREATE POLICY "Anyone can view categories" ON public.forum_categories
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage categories" ON public.forum_categories
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Discussions policies
CREATE POLICY "View discussions" ON public.discussions
  FOR SELECT TO authenticated
  USING (
    team_id IS NULL OR
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = discussions.team_id AND user_id = auth.uid())
  );

CREATE POLICY "Approved users create discussions" ON public.discussions
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_approved(auth.uid()));

CREATE POLICY "Authors update own discussions" ON public.discussions
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin(auth.uid()));

CREATE POLICY "Authors or mods delete discussions" ON public.discussions
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin(auth.uid()));

-- Discussion replies policies
CREATE POLICY "View replies" ON public.discussion_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discussions d 
      WHERE d.id = discussion_id AND (
        d.team_id IS NULL OR
        EXISTS (SELECT 1 FROM public.team_members WHERE team_id = d.team_id AND user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Create replies" ON public.discussion_replies
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_approved(auth.uid()));

CREATE POLICY "Update own replies" ON public.discussion_replies
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Delete own replies" ON public.discussion_replies
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin(auth.uid()));

-- Attachments policies
CREATE POLICY "View attachments" ON public.discussion_attachments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Upload attachments" ON public.discussion_attachments
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_approved(auth.uid()));

CREATE POLICY "Delete own attachments" ON public.discussion_attachments
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Reactions policies
CREATE POLICY "View reactions" ON public.reactions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Add reactions" ON public.reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Remove own reactions" ON public.reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Shared dashboards policies
CREATE POLICY "Owners view own shares" ON public.shared_dashboards
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Create shares" ON public.shared_dashboards
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_approved(auth.uid()));

CREATE POLICY "Update own shares" ON public.shared_dashboards
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Delete own shares" ON public.shared_dashboards
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Achievements - public read
CREATE POLICY "View achievements" ON public.achievements
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage achievements" ON public.achievements
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- User achievements
CREATE POLICY "View own achievements" ON public.user_achievements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Notifications
CREATE POLICY "View own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Tasks policies
CREATE POLICY "View tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid() OR created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.projects p 
      JOIN public.team_members tm ON tm.team_id = p.team_id 
      WHERE p.id = project_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Create tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_approved(auth.uid()));

CREATE POLICY "Update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid() OR created_by = auth.uid()
  );

-- User preferences
CREATE POLICY "View own preferences" ON public.user_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Manage own preferences" ON public.user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Rate limits - system only via service role
CREATE POLICY "Rate limits admin only" ON public.rate_limits
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INT DEFAULT 100,
  p_window_seconds INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Clean old entries and get current count
  DELETE FROM public.rate_limits 
  WHERE identifier = p_identifier AND endpoint = p_endpoint AND window_start < v_window_start;
  
  SELECT request_count INTO v_count 
  FROM public.rate_limits 
  WHERE identifier = p_identifier AND endpoint = p_endpoint;
  
  IF v_count IS NULL THEN
    INSERT INTO public.rate_limits (identifier, endpoint, request_count)
    VALUES (p_identifier, p_endpoint, 1);
    RETURN true;
  ELSIF v_count < p_max_requests THEN
    UPDATE public.rate_limits SET request_count = request_count + 1
    WHERE identifier = p_identifier AND endpoint = p_endpoint;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Function to generate secure share tokens
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at BEFORE UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.discussions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discussion_replies_updated_at BEFORE UPDATE ON public.discussion_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ENABLE REALTIME FOR COMMUNITY FEATURES
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =============================================
-- STORAGE BUCKET FOR COMMUNITY ATTACHMENTS
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('community-attachments', 'community-attachments', false);

-- Storage policies
CREATE POLICY "Users can view community attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'community-attachments');

CREATE POLICY "Approved users upload community attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-attachments' AND public.is_approved(auth.uid()));

CREATE POLICY "Users delete own community attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'community-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- SEED DEFAULT FORUM CATEGORIES
-- =============================================

INSERT INTO public.forum_categories (name, slug, description, icon, sort_order) VALUES
  ('General Discussion', 'general', 'General topics and announcements', 'MessageSquare', 1),
  ('Content Creation', 'content', 'Tips and strategies for creating content', 'Video', 2),
  ('Growth & Analytics', 'growth', 'Channel growth strategies and analytics discussion', 'TrendingUp', 3),
  ('Technical Help', 'tech-help', 'Technical questions and troubleshooting', 'HelpCircle', 4),
  ('Collaborations', 'collabs', 'Find collaboration partners and team members', 'Users', 5);