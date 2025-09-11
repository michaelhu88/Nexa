-- =====================================================
-- Nexa Platform - User Projects Schema Migration
-- =====================================================
-- This migration creates the complete schema for user-based
-- project management, replacing browser-based IndexedDB storage
-- with secure Supabase backend storage.

-- =====================================================
-- 1. USER PROFILES
-- =====================================================
-- Extends Supabase auth.users with additional profile data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- =====================================================
-- 2. PROJECTS
-- =====================================================
-- Core table for managing user projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  url_slug text UNIQUE, -- for sharing/URL routing (e.g., /project/user-slug/project-slug)
  thumbnail_url text, -- project thumbnail/preview image
  settings jsonb DEFAULT '{}', -- project-specific settings
  metadata jsonb DEFAULT '{}', -- git_url, netlify_site_id, vercel_project_id, etc.
  is_public boolean DEFAULT false,
  is_template boolean DEFAULT false, -- can be used as a starter template
  last_accessed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_url_slug ON projects(url_slug);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_projects_template ON projects(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_projects_last_accessed ON projects(user_id, last_accessed_at DESC);

-- =====================================================
-- 3. PROJECT FILES
-- =====================================================
-- Stores all files for each project
CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  content text, -- text content for text files
  content_binary bytea, -- binary content for images, etc.
  is_binary boolean DEFAULT false,
  file_type text, -- mime type or file extension
  file_size integer, -- size in bytes
  checksum text, -- SHA-256 hash for integrity
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, file_path)
);

-- Indexes for file operations
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_path ON project_files(project_id, file_path);

-- =====================================================
-- 4. CHAT MESSAGES
-- =====================================================
-- Stores chat history per project
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  message_id text NOT NULL, -- AI SDK message ID for compatibility
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  annotations jsonb, -- metadata, tool calls, etc.
  parent_message_id uuid REFERENCES chat_messages(id), -- for branching/forking
  created_at timestamptz DEFAULT now()
);

-- Indexes for chat operations
CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_id ON chat_messages(message_id);

-- =====================================================
-- 5. PROJECT SNAPSHOTS
-- =====================================================
-- Stores point-in-time snapshots of project state
CREATE TABLE IF NOT EXISTS public.project_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chat_message_id uuid REFERENCES chat_messages(id),
  name text, -- optional snapshot name
  description text, -- optional description
  snapshot_data jsonb NOT NULL, -- complete file state and metadata
  created_at timestamptz DEFAULT now()
);

-- Indexes for snapshot operations
CREATE INDEX IF NOT EXISTS idx_snapshots_project ON project_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON project_snapshots(project_id, created_at DESC);

-- =====================================================
-- 6. UPDATE EXISTING EMBEDDING TABLES
-- =====================================================
-- First, create a temporary column for migration
ALTER TABLE codebase_embeddings 
  ADD COLUMN IF NOT EXISTS project_uuid uuid REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE indexing_status
  ADD COLUMN IF NOT EXISTS project_uuid uuid REFERENCES projects(id) ON DELETE CASCADE;

-- Note: We'll keep the old project_id columns temporarily for migration
-- After migration, we'll drop them and rename project_uuid to project_id

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_embeddings_project_uuid ON codebase_embeddings(project_uuid);
CREATE INDEX IF NOT EXISTS idx_indexing_project_uuid ON indexing_status(project_uuid);

-- =====================================================
-- 7. PROJECT COLLABORATORS (Future)
-- =====================================================
-- Prepared for future collaboration features
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE codebase_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexing_status ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view any profile" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects Policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Project Files Policies
CREATE POLICY "Users can view files of accessible projects" ON project_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_files.project_id 
      AND (projects.user_id = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can manage files of own projects" ON project_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_files.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Chat Messages Policies
CREATE POLICY "Users can view messages of accessible projects" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = chat_messages.project_id 
      AND (projects.user_id = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can manage messages of own projects" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = chat_messages.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Project Snapshots Policies
CREATE POLICY "Users can view snapshots of accessible projects" ON project_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_snapshots.project_id 
      AND (projects.user_id = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can manage snapshots of own projects" ON project_snapshots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_snapshots.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Embeddings Policies (updated)
CREATE POLICY "Users can view embeddings of accessible projects" ON codebase_embeddings
  FOR SELECT USING (
    project_uuid IS NULL OR -- temporary: allow access to old records
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = codebase_embeddings.project_uuid 
      AND (projects.user_id = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can manage embeddings of own projects" ON codebase_embeddings
  FOR ALL USING (
    project_uuid IS NULL OR -- temporary: allow access to old records
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = codebase_embeddings.project_uuid 
      AND projects.user_id = auth.uid()
    )
  );

-- Indexing Status Policies (updated)
CREATE POLICY "Users can view indexing status of accessible projects" ON indexing_status
  FOR SELECT USING (
    project_uuid IS NULL OR -- temporary: allow access to old records
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = indexing_status.project_uuid 
      AND (projects.user_id = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can manage indexing status of own projects" ON indexing_status
  FOR ALL USING (
    project_uuid IS NULL OR -- temporary: allow access to old records
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = indexing_status.project_uuid 
      AND projects.user_id = auth.uid()
    )
  );

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Function to generate unique project slug
CREATE OR REPLACE FUNCTION generate_project_slug(project_name text, user_id uuid)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Generate base slug from project name
  base_slug := lower(regexp_replace(project_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'project';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM projects WHERE url_slug = final_slug AND projects.user_id = generate_project_slug.user_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to get project statistics
CREATE OR REPLACE FUNCTION get_project_statistics(project_id uuid)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_files', (SELECT COUNT(*) FROM project_files WHERE project_files.project_id = get_project_statistics.project_id),
    'total_messages', (SELECT COUNT(*) FROM chat_messages WHERE chat_messages.project_id = get_project_statistics.project_id),
    'total_snapshots', (SELECT COUNT(*) FROM project_snapshots WHERE project_snapshots.project_id = get_project_statistics.project_id),
    'total_embeddings', (SELECT COUNT(*) FROM codebase_embeddings WHERE project_uuid = get_project_statistics.project_id),
    'last_modified', (SELECT MAX(updated_at) FROM project_files WHERE project_files.project_id = get_project_statistics.project_id)
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. TRIGGERS
-- =====================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE
  ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE
  ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_files_updated_at BEFORE UPDATE
  ON project_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update last_accessed_at when project is accessed
CREATE OR REPLACE FUNCTION update_project_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects 
  SET last_accessed_at = now() 
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: PostgreSQL doesn't support AFTER SELECT triggers
-- The update_project_last_accessed() function can be called from application code instead

-- =====================================================
-- 11. INITIAL DATA & SETUP
-- =====================================================

-- Create profile for existing auth users (if any)
INSERT INTO user_profiles (id, username, full_name)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'username', email),
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Migration complete!
-- Next steps:
-- 1. Run this migration in Supabase dashboard
-- 2. Update application code to use new schema
-- 3. Migrate existing IndexedDB data to new tables
-- =====================================================