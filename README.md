# AI Chatbot Prototype - Nuxt

A simple, minimalist AI chatbot interface built with Nuxt 3, Tailwind CSS, and Nuxt UI.

## Features

- 🎨 Clean, ChatGPT-inspired UI
- 📱 Mobile-first responsive design
- 💬 User messages on right (light salmon background), bot on left (gray background)
- 🦜 Parrot mode: Bot repeats user input (prototype)
- 🧩 Modular component structure

## Project Structure

```
├── components/
│   ├── MessageBubble.vue    # Individual chat message component
│   └── ChatInput.vue         # Fixed bottom input bar component
├── pages/
│   └── chat.vue             # Main chat page at /chat
├── app.vue                  # Root app component
├── nuxt.config.ts           # Nuxt configuration
└── tailwind.config.ts       # Tailwind custom colors
```

## Setup

Install dependencies:

```bash
npm install
```

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

## Next Steps

This is a prototype with parrot functionality. Future enhancements could include:

- ⏱️ Message timestamps
- ⌨️ Typing indicator
- 🔗 LLM integration
- 💾 Chat history persistence
- 🔐 User authentication
- 🗑️ Clear chat functionality

