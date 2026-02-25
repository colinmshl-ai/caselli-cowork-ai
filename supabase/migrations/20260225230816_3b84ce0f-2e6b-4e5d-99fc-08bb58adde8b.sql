
-- PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  plan_tier TEXT NOT NULL DEFAULT 'solo',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- BUSINESS_PROFILES TABLE
CREATE TABLE public.business_profiles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT,
  brokerage_name TEXT,
  market_area TEXT,
  specialties TEXT[],
  team_size TEXT,
  preferred_title_company TEXT,
  preferred_inspector TEXT,
  preferred_photographer TEXT,
  preferred_lender TEXT,
  brand_tone TEXT NOT NULL DEFAULT 'professional',
  brand_voice_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own business profile" ON public.business_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own business profile" ON public.business_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business profile" ON public.business_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own business profile" ON public.business_profiles FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_business_profiles_user_id ON public.business_profiles(user_id);

-- DEALS TABLE
CREATE TABLE public.deals (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_address TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  deal_type TEXT,
  stage TEXT NOT NULL DEFAULT 'lead',
  list_price NUMERIC,
  contract_price NUMERIC,
  closing_date DATE,
  inspection_deadline DATE,
  financing_deadline DATE,
  appraisal_deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own deals" ON public.deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deals" ON public.deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deals" ON public.deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deals" ON public.deals FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_deals_user_id ON public.deals(user_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);

-- CONTACTS TABLE
CREATE TABLE public.contacts (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_type TEXT NOT NULL DEFAULT 'other',
  company TEXT,
  notes TEXT,
  last_contacted TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);

-- CONVERSATIONS TABLE
CREATE TABLE public.conversations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);

-- MESSAGES TABLE
CREATE TABLE public.messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- Messages RLS via conversation ownership
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);

-- TASK_HISTORY TABLE
CREATE TABLE public.task_history (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own task history" ON public.task_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own task history" ON public.task_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own task history" ON public.task_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own task history" ON public.task_history FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_task_history_user_id ON public.task_history(user_id);

-- MEMORY_FACTS TABLE
CREATE TABLE public.memory_facts (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  category TEXT,
  source_conversation_id UUID REFERENCES public.conversations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memory_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own memory facts" ON public.memory_facts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memory facts" ON public.memory_facts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memory facts" ON public.memory_facts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memory facts" ON public.memory_facts FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_memory_facts_user_id ON public.memory_facts(user_id);

-- TRIGGER: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- TRIGGER: Auto-update updated_at
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

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_profiles_updated_at BEFORE UPDATE ON public.business_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
