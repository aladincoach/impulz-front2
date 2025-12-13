# Projects and Topics Implementation

This document describes the implementation of the project and topic management system for conversations.

## Overview

The system organizes conversations into a hierarchical structure:
- **Projects** → **Topics** → **Conversations** → **Messages**

Each conversation is associated with a project and a topic, allowing users to organize their discussions by project and topic.

## Features

### 1. Project Management
- Create, edit, and delete projects
- Each project can have multiple topics
- Default project is created automatically if none exists

### 2. Topic Management
- Create, edit, and delete topics within projects
- Each topic maintains its own conversation thread
- Default topic is created automatically for new projects

### 3. Sidebar Navigation
- **Desktop**: Sidebar is always visible on the left
- **Mobile**: Sidebar is hidden by default, accessible via toggle button
- Shows hierarchical tree of projects and topics
- Click to expand/collapse projects and view topics
- Visual indication of current project and topic

### 4. Topic Change Detection
- When switching topics, if there are existing messages, user is prompted to confirm
- Confirmation dialog asks if user wants to start a new topic thread
- Each topic maintains its own conversation history

### 5. Conversation History
- Conversations are loaded per topic
- When switching topics, the conversation history for that topic is loaded
- Each topic has its own session memory

## Database Schema

### New Tables

#### `projects`
- `id` (UUID, primary key)
- `name` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `metadata` (JSONB)

#### `topics`
- `id` (UUID, primary key)
- `project_id` (UUID, foreign key to projects)
- `name` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `metadata` (JSONB)

### Updated Tables

#### `conversations`
- Added `project_id` (UUID, foreign key to projects, nullable)
- Added `topic_id` (UUID, foreign key to topics, nullable)

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `PATCH /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Topics
- `GET /api/topics` - List all topics (optionally filtered by project_id)
- `POST /api/topics` - Create a new topic
- `PATCH /api/topics/:id` - Update a topic
- `DELETE /api/topics/:id` - Delete a topic

### Conversations
- `GET /api/conversations` - Get conversation history (filtered by topic_id, project_id, or session_id)

### Chat
- `POST /api/chat` - Send a message (now requires `topicId` and accepts `projectId`)

## Components

### `ProjectsSidebar.vue`
- Displays the project/topic tree
- Handles project and topic CRUD operations
- Responsive design (always visible on desktop, toggleable on mobile)
- Edit/delete functionality with confirmation dialogs

### `pages/chat.vue`
- Updated to integrate with projects/topics
- Shows current project and topic in header
- Handles topic switching with confirmation
- Loads conversation history when switching topics

## Composables

### `useProjects.ts`
- Manages project and topic state
- Provides methods for CRUD operations
- Tracks current project and topic
- Auto-creates default project/topic if none exist

## Setup Instructions

1. **Run Database Migration**
   ```sql
   -- Execute the migration file
   supabase/migration_add_projects_topics.sql
   ```

2. **The system will automatically:**
   - Create a default project "New Project" if none exists
   - Create a default topic "New Topic" for each project if none exists
   - Associate conversations with the current topic

## Usage

1. **Starting a Conversation**
   - When you first open the chat, a default project and topic are created
   - You can rename them by clicking the edit icon

2. **Creating a New Project**
   - Click "Add project" in the sidebar
   - Enter a name for the project
   - A default topic will be created automatically

3. **Creating a New Topic**
   - Expand a project in the sidebar
   - Click "Add topic" at the bottom of the topics list
   - Enter a name for the topic

4. **Switching Topics**
   - Click on a different topic in the sidebar
   - If you have messages in the current topic, you'll be asked to confirm
   - The conversation history for the selected topic will load

5. **Editing/Deleting**
   - Hover over a project or topic to see edit/delete buttons
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

- Session IDs are now scoped to topics: `{baseSessionId}_topic_{topicId}`
- This ensures each topic has its own session memory
- Conversations are found/created based on `topic_id` and `session_id`
- The system gracefully handles missing projects/topics by creating defaults

## Future Enhancements

- AI-powered topic change detection based on message content
- Drag-and-drop reordering of projects/topics
- Project/topic archiving
- Search functionality across projects and topics
- Export conversations by project/topic

