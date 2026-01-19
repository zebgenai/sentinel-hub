-- Core Tables Only
CREATE TYPE public.user_state AS ENUM ('REGISTERED', 'KYC_SUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.kyc_document_type AS ENUM ('national_id', 'passport', 'live_photo', 'live_video');
CREATE TYPE public.kyc_decision AS ENUM ('approved', 'rejected', 'pending_review');

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    state user_state NOT NULL DEFAULT 'REGISTERED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

CREATE TABLE public.kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type kyc_document_type NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.kyc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    decision kyc_decision NOT NULL DEFAULT 'pending_review',
    reason TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.youtube_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_url TEXT NOT NULL,
    channel_id TEXT,
    channel_role TEXT,
    channel_niche TEXT,
    channel_creation_date DATE,
    channel_name TEXT,
    subscriber_count INTEGER,
    video_count INTEGER,
    view_count BIGINT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.channel_stats_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
    subscriber_count INTEGER,
    video_count INTEGER,
    view_count BIGINT,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin') $$;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'moderator') $$;

CREATE OR REPLACE FUNCTION public.get_user_state(_user_id UUID)
RETURNS user_state LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT state FROM public.profiles WHERE id = _user_id $$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.get_user_state(_user_id) = 'APPROVED' $$;

-- Trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
    INSERT INTO public.audit_logs (user_id, actor_id, action, entity_type, entity_id, details)
    VALUES (NEW.id, NEW.id, 'USER_REGISTERED', 'user', NEW.id::TEXT, jsonb_build_object('email', NEW.email));
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_stats_snapshots ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_moderator_or_admin(auth.uid()));
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_moderator_or_admin(auth.uid()));
CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "roles_all" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "kyc_docs_select" ON public.kyc_documents FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_moderator_or_admin(auth.uid()));
CREATE POLICY "kyc_docs_insert" ON public.kyc_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kyc_docs_delete" ON public.kyc_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "kyc_verify_select" ON public.kyc_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_moderator_or_admin(auth.uid()));
CREATE POLICY "kyc_verify_insert" ON public.kyc_verifications FOR INSERT TO authenticated WITH CHECK (public.is_moderator_or_admin(auth.uid()));
CREATE POLICY "kyc_verify_update" ON public.kyc_verifications FOR UPDATE TO authenticated USING (public.is_moderator_or_admin(auth.uid()));
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "yt_select" ON public.youtube_channels FOR SELECT TO authenticated USING ((auth.uid() = user_id AND public.is_approved(auth.uid())) OR public.is_moderator_or_admin(auth.uid()));
CREATE POLICY "yt_insert" ON public.youtube_channels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));
CREATE POLICY "yt_update" ON public.youtube_channels FOR UPDATE TO authenticated USING (auth.uid() = user_id AND public.is_approved(auth.uid()));
CREATE POLICY "yt_delete" ON public.youtube_channels FOR DELETE TO authenticated USING (auth.uid() = user_id AND public.is_approved(auth.uid()));
CREATE POLICY "stats_select" ON public.channel_stats_snapshots FOR SELECT TO authenticated USING (public.is_moderator_or_admin(auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

-- Indexes
CREATE INDEX idx_profiles_state ON public.profiles(state);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_youtube_channels_user_id ON public.youtube_channels(user_id);