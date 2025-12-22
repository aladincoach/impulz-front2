# MCP Servers Quick Start

Quick guide to set up MCP servers in Cursor for this project.

## Quick Setup (3 Steps)

### Step 1: Run the Setup Script

```bash
npm run mcp:setup
```

This will generate the MCP configuration based on your `.env` file.

### Step 2: Copy Configuration to Cursor

1. Open Cursor Settings: `Ctrl+,`
2. Click the "Open Settings (JSON)" icon (top right)
3. Add the `mcpServers` section from the script output
4. Save the file

### Step 3: Restart Cursor

Close and reopen Cursor to load the MCP servers.

## What Gets Configured?

Based on your current `.env` file, the script will configure:

- ✅ **Supabase MCP** - Interact with your Supabase database
- ✅ **Filesystem MCP** - Access project files
- ⚠️ **Notion MCP** - Requires OAuth credentials (see below)
- ⚠️ **Netlify MCP** - Requires API token (see below)

## Missing Credentials?

### Notion MCP (OAuth)

The Notion MCP server uses OAuth, which is different from your existing `NOTION_API_KEY`.

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create or select your integration
3. Go to OAuth section
4. Add these to your `.env`:
   ```env
   NOTION_CLIENT_ID=your-client-id
   NOTION_CLIENT_SECRET=your-client-secret
   ```

### Netlify MCP

1. Go to [Netlify User Settings > Applications](https://app.netlify.com/user/applications)
2. Create a new access token
3. Add to your `.env`:
   ```env
   NETLIFY_AUTH_TOKEN=your-token
   ```

## Verify Setup

After restarting Cursor:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Search for "MCP" - you should see MCP-related commands
3. Check Cursor's output/logs for MCP server connection status

## Troubleshooting

**Script doesn't find .env file?**
- Make sure `.env` exists in the project root
- Run `npm run mcp:setup` from the project root

**MCP servers not connecting?**
- Verify Node.js and npm are installed: `node --version` and `npm --version`
- Check Cursor's Developer Tools (Help > Toggle Developer Tools) for errors
- Ensure credentials in `.env` are correct

**Need more help?**
- See `MCP_SERVER_SETUP.md` for detailed documentation
- Check [MCP Documentation](https://modelcontextprotocol.io/)

## Current Status

Based on your `.env` file, you have:
- ✅ Supabase configured (will be added to MCP)
- ✅ Filesystem access (will be added to MCP)
- ⚠️ Notion API key (but MCP needs OAuth - different credentials)
- ⚠️ Netlify (needs API token)

Run `npm run mcp:setup` to see your current configuration!

