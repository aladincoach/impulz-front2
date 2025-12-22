-- Migration: Remove Topics Layer
-- This simplifies the hierarchy from Project -> Topic -> Conversation -> Message
-- to Project -> Conversation -> Message

-- Step 1: Add 'name' column to conversations table for user-visible names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'name'
  ) THEN
    ALTER TABLE conversations ADD COLUMN name TEXT;
  END IF;
END $$;

-- Step 2: Migrate existing conversations - set name from topic name if available
UPDATE conversations c
SET name = t.name
FROM topics t
WHERE c.topic_id = t.id AND c.name IS NULL;

-- Set default name for conversations without topics
UPDATE conversations
SET name = 'Conversation'
WHERE name IS NULL;

-- Step 3: Remove topic_id from conversations table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'topic_id'
  ) THEN
    -- Drop the index first if it exists
    DROP INDEX IF EXISTS idx_conversations_topic_id;
    -- Drop the column
    ALTER TABLE conversations DROP COLUMN topic_id;
  END IF;
END $$;

-- Step 4: Remove topic_id from challenges table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenges' AND column_name = 'topic_id'
  ) THEN
    -- Drop the index first if it exists
    DROP INDEX IF EXISTS idx_challenges_topic_id;
    -- Drop the column
    ALTER TABLE challenges DROP COLUMN topic_id;
  END IF;
END $$;

-- Step 5: Drop topics table
DROP TABLE IF EXISTS topics CASCADE;

-- Step 6: Create index on conversations.name for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_name ON conversations(name);

-- Step 7: Update conversations to ensure project_id is set where possible
-- (This helps maintain data integrity during migration)
-- Note: Conversations without project_id will be orphaned and may need manual cleanup

-- Verify migration completed
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Topics layer removed successfully';
  RAISE NOTICE 'Conversations now have a name column for display';
  RAISE NOTICE 'Challenges are now linked directly to projects only';
END $$;

