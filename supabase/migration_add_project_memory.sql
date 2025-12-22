-- Migration: Add project_memory table for persistent memory storage
-- This enables cross-device synchronization (desktop/mobile)

-- Create project_memory table
CREATE TABLE IF NOT EXISTS project_memory (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  memory JSONB NOT NULL DEFAULT '{
    "project": {},
    "progress": {"activities": [], "milestones": []},
    "user": {"skills": [], "assets": [], "constraints": {}}
  }'::jsonb,
  questions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_memory_updated_at ON project_memory(updated_at);

-- Enable Row Level Security
ALTER TABLE project_memory ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on project_memory" ON project_memory
  FOR ALL USING (true) WITH CHECK (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_project_memory_updated_at
  BEFORE UPDATE ON project_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing memory data from projects.description if it exists
-- (This handles cases where memory was previously stored in projects.description as JSONB)
DO $$
BEGIN
  -- Check if projects table has description column with JSONB data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'description' AND data_type = 'jsonb'
  ) THEN
    -- Migrate existing memory data
    INSERT INTO project_memory (project_id, memory, updated_at)
    SELECT 
      id,
      CASE 
        WHEN description IS NOT NULL AND description != '{}'::jsonb 
        THEN description
        ELSE '{
          "project": {},
          "progress": {"activities": [], "milestones": []},
          "user": {"skills": [], "assets": [], "constraints": {}}
        }'::jsonb
      END,
      updated_at
    FROM projects
    WHERE id NOT IN (SELECT project_id FROM project_memory)
    ON CONFLICT (project_id) DO NOTHING;
    
    RAISE NOTICE 'Migrated existing memory data from projects.description';
  END IF;
END $$;

-- Drop session_id column from conversations table (no longer needed)
ALTER TABLE conversations DROP COLUMN IF EXISTS session_id;

-- Drop related indexes
DROP INDEX IF EXISTS idx_conversations_session_id;

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: project_memory table created, session_id removed from conversations';
END $$;

