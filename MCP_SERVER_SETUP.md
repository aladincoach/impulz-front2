# MCP Server Configuration Guide

This guide explains how to connect Cursor to MCP (Model Context Protocol) servers for Notion, Supabase, Nuxt, Vue, and Netlify.

## What are MCP Servers?

MCP servers allow AI assistants like Cursor to interact with external services and tools, providing enhanced context and capabilities during development.

## Configuration Location

MCP servers in Cursor are configured in Cursor's settings file. On Windows, this is typically located at:

```
%APPDATA%\Cursor\User\settings.json
```

Or you can access it through Cursor:
1. Open Cursor Settings (Ctrl+,)
2. Search for "MCP" or "Model Context Protocol"
3. Edit the settings.json file directly

## Available MCP Servers

### 1. Notion MCP Server

Notion provides a hosted MCP server that allows AI agents to interact with your Notion workspace.

**Setup Steps:**

1. **Get Notion OAuth Credentials:**
   - Go to [Notion Integrations](https://www.notion.so/my-integrations)
   - Create a new integration or use your existing one
   - Note your OAuth client ID and client secret

2. **Configure in Cursor Settings:**

**Option A: Using Notion's Hosted MCP Server (Recommended)**
Notion provides a hosted MCP server. Check their documentation for the exact endpoint and OAuth setup.

**Option B: Using Community MCP Server**
```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-notion"
      ],
      "env": {
        "NOTION_CLIENT_ID": "your-client-id",
        "NOTION_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

**Note:** Verify the exact package name exists on npm. If not available, use Notion's hosted MCP server endpoint.

**Resources:**
- [Notion MCP Server Blog Post](https://www.notion.com/blog/notions-hosted-mcp-server-an-inside-look)
- [Notion API Documentation](https://developers.notion.com/)

### 2. Supabase MCP Server

Supabase provides an MCP server for interacting with your Supabase projects.

**Setup Steps:**

1. **Get Supabase Credentials:**
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy your Project URL and Service Role Key (or Anon Key)

2. **Configure in Cursor Settings:**

Supabase provides official MCP server support. Check their documentation for the exact setup method:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_KEY": "your-service-role-key-or-anon-key"
      }
    }
  }
}
```

**Alternative:** Supabase may also support dynamic client registration. Refer to their MCP documentation for the latest setup method.

**Resources:**
- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase Security Guidelines](https://supabase.com/docs/guides/getting-started/mcp#security-best-practices)

### 3. Nuxt MCP Server

For Nuxt-specific tooling and context, you can use community MCP servers or create custom ones.

**Note:** There isn't an official Nuxt MCP server yet, but you can:
- Use file system MCP servers to interact with your Nuxt project
- Create custom MCP servers using the MCP SDK

**Example Configuration (File System MCP):**

```json
{
  "mcpServers": {
    "nuxt-files": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\domin\\Documents\\impulz\\impulz-front2"
      ]
    }
  }
}
```

### 4. Vue MCP Server

Similar to Nuxt, Vue doesn't have an official MCP server, but you can use file system MCP servers or create custom integrations.

### 5. Netlify MCP Server

Netlify provides MCP integration through their platform.

**Setup Steps:**

1. **Get Netlify Credentials:**
   - Go to [Netlify User Settings > Applications](https://app.netlify.com/user/applications)
   - Create a new access token
   - Copy your Netlify API token

2. **Configure in Cursor Settings:**

**Note:** Netlify MCP server availability may vary. Check the [MCP Server Registry](https://github.com/modelcontextprotocol/servers) for available Netlify integrations.

If available, configure as:
```json
{
  "mcpServers": {
    "netlify": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-netlify"
      ],
      "env": {
        "NETLIFY_AUTH_TOKEN": "your-netlify-api-token"
      }
    }
  }
}
```

**Alternative:** Use Netlify's CLI or API integration through custom MCP servers or file system access.

## Complete Configuration Example

Here's a complete example combining all MCP servers:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-notion"
      ],
      "env": {
        "NOTION_CLIENT_ID": "your-notion-client-id",
        "NOTION_CLIENT_SECRET": "your-notion-client-secret"
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_KEY": "your-supabase-key"
      }
    },
    "netlify": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-netlify"
      ],
      "env": {
        "NETLIFY_AUTH_TOKEN": "your-netlify-token"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\domin\\Documents\\impulz\\impulz-front2"
      ]
    }
  }
}
```

## Environment Variables

For security, you can also use environment variables instead of hardcoding credentials:

1. Create a `.env` file in your project root (already exists)
2. Add your credentials there
3. Reference them in the MCP configuration

**Example `.env` file:**

```env
NOTION_CLIENT_ID=your-client-id
NOTION_CLIENT_SECRET=your-client-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
NETLIFY_AUTH_TOKEN=your-netlify-token
```

## Verification

After configuring MCP servers:

1. Restart Cursor
2. Open the Command Palette (Ctrl+Shift+P)
3. Search for "MCP" to see available MCP commands
4. Check the Cursor output/logs for MCP server connection status

## Troubleshooting

### MCP Servers Not Connecting

1. **Check Node.js Installation:**
   ```bash
   node --version
   npm --version
   ```

2. **Verify NPX Works:**
   ```bash
   npx --version
   ```

3. **Check Cursor Logs:**
   - Open Cursor's Developer Tools (Help > Toggle Developer Tools)
   - Check the Console for MCP-related errors

### Authentication Issues

1. **Notion:**
   - Ensure OAuth credentials are correct
   - Complete the OAuth flow if required
   - Check that your integration has the necessary permissions

2. **Supabase:**
   - Verify your project URL is correct
   - Ensure you're using the correct key (Service Role vs Anon Key)
   - Check Supabase project settings

3. **Netlify:**
   - Verify your API token is valid
   - Check token permissions in Netlify dashboard

### Server Not Found Errors

If you get "server not found" errors:
1. Ensure the MCP server package name is correct
2. Try running the npx command manually in terminal
3. Check if the package exists on npm

## Current Project Integration

Your project already has:
- ✅ Notion integration via `@notionhq/client` (server/utils/notion.ts)
- ✅ Supabase integration via `@supabase/supabase-js` (server/utils/supabase.ts)
- ✅ Nuxt.js framework (nuxt.config.ts)
- ✅ Netlify deployment configuration (netlify.toml)

MCP servers complement these existing integrations by providing AI context and tooling capabilities directly in Cursor.

## Additional Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers)
- [Creating Custom MCP Servers](https://modelcontextprotocol.io/docs/tutorials/create-an-mcp-server)

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit credentials to version control**
2. **Use environment variables for sensitive data**
3. **Review MCP server permissions carefully**
4. **Use Service Role keys only in secure environments**
5. **Rotate credentials regularly**

For Supabase specifically:
- Use Anon Key for client-side operations
- Use Service Role Key only for server-side/admin operations
- Review RLS (Row Level Security) policies

