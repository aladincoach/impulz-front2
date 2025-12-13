# Supabase Setup for Conversations and Messages

This directory contains the database schema and setup instructions for storing conversations and messages in Supabase.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Create a new project or use an existing one
3. Note down your project URL and API keys from Settings > API

### 2. Run the Database Schema

**Option A: Fresh Start (Recommended for new projects)**

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Run the SQL script

**Option B: Migration (If you have existing tables)**

If you already have tables but are missing the `session_id` column, use the migration script instead:

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `migration_add_session_id.sql`
4. Run the SQL script

**Note:** The main `schema.sql` file will drop existing tables. Use the migration script if you want to keep existing data.

This will create:
- `conversations` table - stores conversation metadata and session information
- `messages` table - stores individual messages (user and assistant)
- Indexes for better query performance
- Row Level Security (RLS) policies (currently set to allow all operations)

### 3. Configure Environment Variables

Add the following to your `.env` file (or set them in your deployment platform):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # Optional, use anon key if not available
```

You can find these values in your Supabase project settings under API.

### 4. Security Considerations

The current RLS policies allow all operations. For production, you should:

1. **Enable Authentication**: Set up Supabase Auth if you want user-specific conversations
2. **Update RLS Policies**: Restrict access based on user authentication
3. **Use Service Key Carefully**: The service key bypasses RLS - only use it server-side

Example RLS policy for authenticated users:

```sql
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Allow all operations on conversations" ON conversations;
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;

-- Create user-specific policies
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (auth.uid()::text = session_id);

CREATE POLICY "Users can create their own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid()::text = session_id);

CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE session_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE session_id = auth.uid()::text
    )
  );
```

## Database Schema

### Conversations Table

- `id` (UUID, Primary Key) - Unique conversation identifier
- `session_id` (TEXT, Unique) - Session identifier (can be linked to user ID)
- `created_at` (TIMESTAMP) - When the conversation was created
- `updated_at` (TIMESTAMP) - Last update timestamp (auto-updated)
- `metadata` (JSONB) - Additional metadata (e.g., conversation state)

### Messages Table

- `id` (UUID, Primary Key) - Unique message identifier
- `conversation_id` (UUID, Foreign Key) - References conversations.id
- `content` (TEXT) - Message content
- `role` (TEXT) - Either 'user' or 'assistant'
- `created_at` (TIMESTAMP) - When the message was created
- `metadata` (JSONB) - Additional message metadata

## Usage

The integration is automatically used by the chat API (`server/api/chat.post.ts`). Messages are saved to Supabase whenever:

1. A user sends a message
2. The assistant responds

Conversation state is also persisted to the `metadata` field of the conversations table.

## Loading Conversation History

You can load previous conversations using the helper functions in `server/utils/supabase.ts`:

```typescript
import { getConversationHistory } from '../utils/supabase'

// Load conversation history for a session
const history = await getConversationHistory(sessionId, event)
// Returns: [{ text: string, isUser: boolean }, ...]
```

