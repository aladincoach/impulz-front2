-- Migration script to add session_id column if it doesn't exist
-- Use this if you have existing tables but missing the session_id column

-- Check and add session_id to conversations table if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN session_id TEXT;
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'conversations_session_id_key'
    ) THEN
      ALTER TABLE conversations ADD CONSTRAINT conversations_session_id_key UNIQUE (session_id);
    END IF;
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);


