# Projects and Conversations Implementation

This document describes the implementation of the project and conversation management system.

## Overview

The system organizes conversations into a hierarchical structure:
- **Projects** → **Conversations** → **Messages**

Each conversation is associated with a project, allowing users to organize their discussions by project.

## Features

### 1. Project Management
- Create, edit, and delete projects
- Each project can have multiple conversations
- Default project is created automatically if none exists

### 2. Conversation Management
- Create, edit, and delete conversations within projects
- Each conversation maintains its own message thread
- Conversations are auto-named based on the first message (first 50 characters)
- Default conversation is created automatically for new projects

### 3. Sidebar Navigation
- **Desktop**: Sidebar is always visible on the left
- **Mobile**: Sidebar is hidden by default, accessible via toggle button
- Shows hierarchical tree of projects and conversations
- Click to expand/collapse projects and view conversations
- Visual indication of current project and conversation

### 4. Conversation Switching
- When switching conversations, the message history for that conversation is loaded
- Session memory is shared across all conversations in a project

### 5. Conversation History
- Conversations are loaded per project
- When switching conversations, the message history for that conversation is loaded
- Each project shares session memory across all its conversations

## Database Schema

### Tables

#### `projects`
- `id` (UUID, primary key)
- `name` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `metadata` (JSONB)

#### `conversations`
- `id` (UUID, primary key)
- `project_id` (UUID, foreign key to projects)
- `name` (TEXT)
- `session_id` (TEXT, unique)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `metadata` (JSONB)

#### `messages`
- `id` (UUID, primary key)
- `conversation_id` (UUID, foreign key to conversations)
- `content` (TEXT)
- `role` (TEXT: 'user' or 'assistant')
- `created_at` (TIMESTAMP)
- `metadata` (JSONB)

#### `challenges`
- `id` (UUID, primary key)
- `project_id` (UUID, foreign key to projects)
- `document_type` (TEXT: 'action_plan', 'flash_diagnostic', 'other')
- `title` (TEXT)
- `content` (TEXT)
- `expires_at` (TIMESTAMP)
- `validated_at` (TIMESTAMP, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `metadata` (JSONB)

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `PATCH /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Conversations
- `GET /api/conversations` - Get conversations (filtered by project_id) or messages (by conversation_id)
- `POST /api/conversations` - Create a new conversation
- `PATCH /api/conversations/:id` - Update a conversation
- `DELETE /api/conversations/:id` - Delete a conversation

### Chat
- `POST /api/chat` - Send a message (requires `conversationId` and accepts `projectId`)

### Memory
- `GET /api/memory/:projectId` - Get session memory for a project

### Challenges
- `GET /api/challenges` - Get challenges for a project
- `POST /api/challenges` - Create a new challenge
- `POST /api/challenges/:id/validate` - Validate a challenge

## Components

### `ProjectsSidebar.vue`
- Displays the project/conversation tree
- Handles project and conversation CRUD operations
- Responsive design (always visible on desktop, toggleable on mobile)
- Edit/delete functionality with confirmation dialogs

### `pages/chat.vue`
- Updated to integrate with projects/conversations
- Shows current project and conversation in header
- Handles conversation switching
- Loads message history when switching conversations

### `DocumentsPanel.vue`
- Displays project memory and challenges
- Shows known and unknown project information
- Loads challenges by project

## Composables

### `useProjects.ts`
- Manages project and conversation state
- Provides methods for CRUD operations
- Tracks current project and conversation
- Auto-creates default project/conversation if none exist

## Setup Instructions

1. **Run Database Migration**
   ```sql
   -- For new installations, run:
   supabase/schema.sql
   
   -- For existing installations with topics, run:
   supabase/migration_remove_topics.sql
   ```

2. **The system will automatically:**
   - Create a default project "New Project" if none exists
   - Create a default conversation "New Conversation" for each project if none exists
   - Auto-name conversations based on first message content

## Usage

1. **Starting a Conversation**
   - When you first open the chat, a default project and conversation are created
   - You can rename them by clicking the edit icon

2. **Creating a New Project**
   - Click "Add project" in the sidebar
   - Enter a name for the project
   - A default conversation will be created automatically

3. **Creating a New Conversation**
   - Expand a project in the sidebar
   - Click "Add conversation" at the bottom of the conversations list
   - Enter a name for the conversation (or leave default)

4. **Switching Conversations**
   - Click on a different conversation in the sidebar
   - The message history for the selected conversation will load

5. **Editing/Deleting**
   - Hover over a project or conversation to see edit/delete buttons
   - Click edit to rename
   - Click delete to remove (with confirmation)

## Mobile Behavior

- On mobile devices (< 768px width):
  - Sidebar is hidden by default
  - Toggle button appears on the left edge of the screen
  - Click to open/close sidebar
  - Overlay appears when sidebar is open

- On desktop:
  - Sidebar is always visible
  - Takes up 256px (w-64) of width on the left
  - Main content area adjusts automatically

## Technical Notes

- Session IDs are now scoped to projects: `{baseSessionId}_project_{projectId}`
- This ensures all conversations in a project share the same session memory
- Conversations are found/created based on `conversation_id`
- The system gracefully handles missing projects/conversations by creating defaults
- Conversations are auto-named from the first message content (first 50 chars)

## Future Enhancements

- AI-powered conversation summarization
- Drag-and-drop reordering of projects/conversations
- Project/conversation archiving
- Search functionality across projects and conversations
- Export conversations by project
