-- Migration script to add description JSONB field to projects table
-- This stores the complete project information as JSONB

-- Add description column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'description'
  ) THEN
    ALTER TABLE projects ADD COLUMN description JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index for description field queries (optional, useful if you query specific fields)
CREATE INDEX IF NOT EXISTS idx_projects_description ON projects USING GIN (description);

