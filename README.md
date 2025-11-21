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

## Project Structure

```
├── components/
│   ├── MessageBubble.vue      # Individual chat message component with loading state
│   ├── ChatInput.vue          # Fixed bottom input bar component
│   └── LanguageSwitcher.vue   # Language toggle component
├── pages/
│   └── chat.vue               # Main chat page at /chat
├── server/
│   └── api/
│       └── chat.post.ts       # API endpoint for Claude integration
├── app.vue                    # Root app component
├── nuxt.config.ts             # Nuxt configuration
└── tailwind.config.ts         # Tailwind custom colors
```

## Setup

### 1. Install dependencies:

```bash
npm install
```

### 2. Configure your Claude API key:

Create a `.env` file at the root of the project:

```bash
ANTHROPIC_API_KEY=your_api_key_here

# System Prompt Cache (optional)
# true = Cache le system prompt (par défaut, meilleure performance en production)
# false = Recharge le system prompt à chaque message (utile en développement)
SYSTEM_PROMPT_CACHE=true
```

To get your API key, visit [Anthropic Console](https://console.anthropic.com/)

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
- `SYSTEM_PROMPT_CACHE`: Set to `true` for production (recommended for better performance)

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

- **Model**: Claude 3.5 Sonnet (claude-3-5-sonnet-20240620)
- **Max tokens**: 4096
- **API**: Anthropic Messages API with streaming
- **Frontend**: Vue 3 Composition API with TypeScript
- **Styling**: Tailwind CSS + Nuxt UI components
- **Logs**: Detailed console logs for debugging (frontend + backend)

## Next Steps

Future enhancements could include:

- ⏱️ Message timestamps
- 💾 Chat history persistence (LocalStorage/Database)
- 🔐 User authentication
- 🗑️ Clear chat functionality
- 📎 File upload support
- 🎯 System prompts customization

