-- =============================================
-- PATHLY.APP - VOLLSTÄNDIGES SUPABASE SQL SETUP
-- =============================================

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals Table  
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target_value INTEGER NOT NULL DEFAULT 100,
  current_value INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',
  target_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Tasks Table
CREATE TABLE IF NOT EXISTS daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target_value INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'mal',
  active_days TEXT[] NOT NULL DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Task Completions Table
CREATE TABLE IF NOT EXISTS daily_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_task_id UUID REFERENCES daily_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_value INTEGER NOT NULL DEFAULT 1,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(daily_task_id, completed_date)
);

-- Streaks Table
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Goals Policies
CREATE POLICY "Users can view own goals" 
  ON goals FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" 
  ON goals FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" 
  ON goals FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" 
  ON goals FOR DELETE 
  USING (auth.uid() = user_id);

-- Daily Tasks Policies
CREATE POLICY "Users can view own daily tasks" 
  ON daily_tasks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily tasks" 
  ON daily_tasks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily tasks" 
  ON daily_tasks FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily tasks" 
  ON daily_tasks FOR DELETE 
  USING (auth.uid() = user_id);

-- Daily Task Completions Policies
CREATE POLICY "Users can view own completions" 
  ON daily_task_completions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions" 
  ON daily_task_completions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions" 
  ON daily_task_completions FOR DELETE 
  USING (auth.uid() = user_id);

-- Streaks Policies
CREATE POLICY "Users can view own streaks" 
  ON streaks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks" 
  ON streaks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" 
  ON streaks FOR UPDATE 
  USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function: Auto-delete accounts marked for deletion after 30 days
CREATE OR REPLACE FUNCTION delete_old_marked_accounts()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id FROM profiles
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment goal progress
CREATE OR REPLACE FUNCTION increment_goal_progress(goal_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE goals
  SET 
    current_value = LEAST(current_value + amount, target_value),
    updated_at = NOW()
  WHERE id = goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger: Update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_tasks_updated_at
  BEFORE UPDATE ON daily_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SCHEDULED FUNCTION (Configure in Supabase Dashboard)
-- =============================================
-- Go to Database → Cron Jobs and add:
-- Schedule: 0 2 * * * (Every day at 2 AM)
-- Function: delete_old_marked_accounts()

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_id ON daily_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_goal_id ON daily_tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_completions_user_id ON daily_task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_task_date ON daily_task_completions(daily_task_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================
-- INITIAL DATA (Optional)
-- =============================================

-- You can add sample data here if needed
-- Example:
-- INSERT INTO profiles (id, username) VALUES ('your-user-id', 'Demo User');
