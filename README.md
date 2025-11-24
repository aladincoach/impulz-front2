# AI Chatbot Prototype - Nuxt

A simple, minimalist AI chatbot interface built with Nuxt 3, Tailwind CSS, and Nuxt UI, powered by Claude AI.

## Features

- 🎨 Clean, ChatGPT-inspired UI
- 📱 Mobile-first responsive design
- 💬 User messages on right (light salmon background), bot on left (gray background)
- 🤖 **Powered by Claude AI (Anthropic)**
- ⚡ **Real-time streaming responses**
- 💭 **Animated loading indicator**
- 🌐 **Bilingual support (French/English)**
- 🧩 Modular component structure
- 🔄 **Workflow-based coaching system** (60-75% reduction in prompt tokens)

## Project Structure

```
├── components/
│   ├── MessageBubble.vue      # Individual chat message component with loading state
│   ├── ChatInput.vue          # Fixed bottom input bar component
│   └── LanguageSwitcher.vue   # Language toggle component
├── pages/
│   └── chat.vue               # Main chat page at /chat
├── server/
│   ├── api/
│   │   └── chat.post.ts       # API endpoint for Claude integration
│   └── utils/
│       ├── workflowTypes.ts            # TypeScript types for workflow
│       ├── basePrompt.ts               # Minimal base system prompt
│       ├── stagePrompts.ts             # Stage-specific prompts
│       ├── workflowEngine.ts           # Workflow logic & state management
│       ├── conversationStateManager.ts # Session state persistence
│       ├── systemPrompt.ts             # Legacy monolithic prompt
│       └── notion.ts                   # Notion integration
├── app.vue                    # Root app component
├── nuxt.config.ts             # Nuxt configuration
├── tailwind.config.ts         # Tailwind custom colors
└── WORKFLOW_REFACTORING.md    # Detailed workflow documentation
```

## Setup

### 1. Install dependencies:

```bash
npm install
```

### 2. Configure environment variables:

Create a `.env` file at the root of the project:

```bash
# Anthropic API Key (required)
ANTHROPIC_API_KEY=your_api_key_here

# Workflow Configuration (recommended)
# Set to 'false' to use legacy monolithic prompt system
USE_WORKFLOW=true

# System Prompt Cache (for legacy mode)
# Set to 'true' to use hardcoded prompt instead of fetching from Notion
SYSTEM_PROMPT_CACHE=false

# Notion Configuration (optional, for legacy mode)
NOTION_API_KEY=your_notion_integration_token
NOTION_PROMPT_PAGE_ID=your_notion_page_id
NOTION_CACHE_SECONDS=300
```

**Important**: 
- The new **workflow-based system** (default) reduces prompt tokens by 60-75%
- To get your Anthropic API key, visit [Anthropic Console](https://console.anthropic.com/)
- For workflow details, see [WORKFLOW_REFACTORING.md](./WORKFLOW_REFACTORING.md)
- For Notion setup (legacy mode), see [NOTION_SETUP.md](./NOTION_SETUP.md)

## Development

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:3000/chat` to see the chatbot.

## Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Deployment on Netlify

This app is configured for deployment on Netlify with the following setup:

### 1. Environment Variables

In your Netlify dashboard, go to **Site settings → Environment variables** and add:

- `ANTHROPIC_API_KEY`: Your Claude API key (mark it as **Secret**)
- `NOTION_API_KEY`: Your Notion integration token (mark it as **Secret**)
- `NOTION_PROMPT_PAGE_ID`: Your Notion page ID containing the system prompt

For detailed setup instructions, see [NOTION_SETUP.md](./NOTION_SETUP.md)

### 2. Build Configuration

The `netlify.toml` file is pre-configured with:
- Build command: `npm run build`
- Publish directory: `.output/public`
- Secrets scanning: Configured to ignore server bundles (`.netlify/functions-internal/**`)
- **No plugin required**: Nuxt 3 with Nitro automatically generates Netlify-compatible serverless functions

**Important**: The API key is only used server-side in Nitro functions and is never exposed to clients. The `netlify.toml` configuration tells Netlify's security scanner to skip the server bundle files since they run only on the server.

## How it Works

1. **User sends a message**: The message is added to the conversation history
2. **Loading indicator**: An animated three-dot indicator appears while waiting for Claude
3. **API call**: The message is sent to `/api/chat` with conversation history
4. **Streaming response**: Claude's response streams in real-time using Server-Sent Events (SSE)
5. **Display**: The response appears word-by-word as it's received

## Technical Details

- **Model**: Claude 3.5 Haiku (claude-3-5-haiku-20241022)
- **Max tokens**: 4096
- **API**: Anthropic Messages API with streaming
- **Frontend**: Vue 3 Composition API with TypeScript
- **Styling**: Tailwind CSS + Nuxt UI components
- **Logs**: Detailed console logs for debugging (frontend + backend)
- **Workflow**: 7-stage coaching workflow with automatic progression and skip logic

### Workflow Architecture

The system uses a **stage-based workflow** that significantly reduces token usage:

1. **Intent Understanding** - Categorize user's intent (funding, selling, building, etc.)
2. **Project Understanding** - Gather business model details (skipped if generic question)
3. **Project Progress** - Determine project phase (vision → research → design → test → launch → growth)
4. **Underlying Problem** - Validate intent-phase compatibility (challenges premature goals)
5. **Action** - Propose 3 priority actions aligned with current stage
6. **Guidance** - Provide detailed guidance (skipped if user declines)
7. **Debrief** - Session wrap-up and scheduling

**Token Savings**: ~60-75% reduction in system prompt tokens vs. monolithic approach

For detailed workflow documentation, see [WORKFLOW_REFACTORING.md](./WORKFLOW_REFACTORING.md)

## Next Steps

Future enhancements could include:

- ⏱️ Message timestamps
- 💾 Chat history persistence (LocalStorage/Database)
- 🔐 User authentication
- 🗑️ Clear chat functionality
- 📎 File upload support
- 🎯 System prompts customization

