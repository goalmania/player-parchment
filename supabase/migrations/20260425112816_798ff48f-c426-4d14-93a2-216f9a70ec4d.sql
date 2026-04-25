-- Enum for organization type
CREATE TYPE public.org_type AS ENUM ('agency', 'club');

-- Enum for access request status
CREATE TYPE public.access_request_status AS ENUM ('pending', 'accepted', 'rejected');

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_type public.org_type NOT NULL,
  org_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles visible to authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- PLAYERS TABLE
-- =====================================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  num TEXT,
  name TEXT NOT NULL,
  photo TEXT,
  age INTEGER,
  birth_year INTEGER,
  nationality TEXT,
  flag TEXT,
  club TEXT,
  league TEXT,
  region TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  position_main TEXT,
  position_code TEXT,
  position_secondary JSONB DEFAULT '[]'::jsonb,
  foot TEXT,
  height INTEGER,
  weight INTEGER,
  tactical_roles JSONB DEFAULT '[]'::jsonb,
  ratings JSONB DEFAULT '{}'::jsonb,
  skills JSONB DEFAULT '{}'::jsonb,
  stars JSONB DEFAULT '{}'::jsonb,
  market JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  verdict_type TEXT,
  verdict TEXT,
  observation_type TEXT,
  observation_count INTEGER DEFAULT 0,
  date DATE,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  video_urls JSONB DEFAULT '[]'::jsonb,
  raw_report TEXT,
  observations JSONB DEFAULT '[]'::jsonb,
  heatmap JSONB DEFAULT '[]'::jsonb,
  formations_played JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_owner ON public.players(owner_id);
CREATE INDEX idx_players_name ON public.players(name);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ACCESS REQUESTS TABLE
-- =====================================================
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.access_request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, requester_id)
);

CREATE INDEX idx_access_req_owner ON public.access_requests(owner_id);
CREATE INDEX idx_access_req_requester ON public.access_requests(requester_id);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Security definer function to check access without recursion
CREATE OR REPLACE FUNCTION public.has_player_access(_user_id UUID, _player_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.access_requests
    WHERE requester_id = _user_id
      AND player_id = _player_id
      AND status = 'accepted'
  );
$$;

-- Players policies
CREATE POLICY "Owners can view own players"
  ON public.players FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_player_access(auth.uid(), id));

CREATE POLICY "Owners can insert own players"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own players"
  ON public.players FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own players"
  ON public.players FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Access requests policies
CREATE POLICY "Users see own requests in or out"
  ON public.access_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = owner_id);

CREATE POLICY "Users can create requests as themselves"
  ON public.access_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Owners can update request status"
  ON public.access_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Requester can delete own pending request"
  ON public.access_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id AND status = 'pending');

-- =====================================================
-- TIMESTAMP UPDATE TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_players_updated
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_access_req_updated
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, org_type, org_name, display_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'org_type')::public.org_type, 'agency'),
    COALESCE(NEW.raw_user_meta_data->>'org_name', 'Mia Organizzazione'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();