-- Drop existing tables if they exist (to start fresh)
-- Comment out these lines if you want to keep existing data
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS conversations CASCADE;
-- DROP TABLE IF EXISTS project_memory CASCADE;

-- Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  name TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create project_memory table for persistent memory storage
-- Memory is scoped per project and shared across all conversations
CREATE TABLE project_memory (
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_name ON conversations(name);
CREATE INDEX IF NOT EXISTS idx_project_memory_updated_at ON project_memory(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_memory ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth requirements)
-- For now, allowing all operations - you may want to restrict this based on user authentication
CREATE POLICY "Allow all operations on conversations" ON conversations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on messages" ON messages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on project_memory" ON project_memory
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_memory_updated_at
  BEFORE UPDATE ON project_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create challenges/documents table
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('action_plan', 'flash_diagnostic', 'other')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for challenges
CREATE INDEX IF NOT EXISTS idx_challenges_project_id ON challenges(project_id);
CREATE INDEX IF NOT EXISTS idx_challenges_document_type ON challenges(document_type);
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_challenges_validated_at ON challenges(validated_at);

-- Enable Row Level Security for challenges
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Create policy for challenges (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on challenges" ON challenges
  FOR ALL USING (true) WITH CHECK (true);

-- Create trigger to automatically update updated_at for challenges
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
