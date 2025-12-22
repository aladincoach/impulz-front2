#!/usr/bin/env node

/**
 * MCP Server Setup Helper Script
 * 
 * This script helps you configure MCP servers in Cursor.
 * It reads your .env file and generates the MCP configuration
 * that you can copy into Cursor's settings.json file.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

function loadEnvFile() {
  const envPath = join(projectRoot, '.env');
  if (!existsSync(envPath)) {
    console.warn('⚠️  .env file not found. Using env.example as reference.');
    return {};
  }

  const envContent = readFileSync(envPath, 'utf-8');
  const env = {};
  
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
  
  return env;
}

function generateMCPConfig(env) {
  const workspacePath = projectRoot.replace(/\\/g, '/');
  
  const config = {
    mcpServers: {}
  };

  // Notion MCP Server
  if (env.NOTION_CLIENT_ID || env.NOTION_API_KEY) {
    config.mcpServers.notion = {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-notion'
      ],
      env: {}
    };
    
    if (env.NOTION_CLIENT_ID) {
      config.mcpServers.notion.env.NOTION_CLIENT_ID = env.NOTION_CLIENT_ID;
    }
    if (env.NOTION_CLIENT_SECRET) {
      config.mcpServers.notion.env.NOTION_CLIENT_SECRET = env.NOTION_CLIENT_SECRET;
    }
    // Note: MCP Notion server uses OAuth, not API key
    // But we can still configure it if OAuth credentials exist
  }

  // Supabase MCP Server
  if (env.SUPABASE_URL) {
    config.mcpServers.supabase = {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-supabase'
      ],
      env: {
        SUPABASE_URL: env.SUPABASE_URL
      }
    };
    
    // Use service key if available, otherwise anon key
    if (env.SUPABASE_SERVICE_KEY) {
      config.mcpServers.supabase.env.SUPABASE_KEY = env.SUPABASE_SERVICE_KEY;
    } else if (env.SUPABASE_ANON_KEY) {
      config.mcpServers.supabase.env.SUPABASE_KEY = env.SUPABASE_ANON_KEY;
    }
  }

  // Netlify MCP Server
  if (env.NETLIFY_AUTH_TOKEN) {
    config.mcpServers.netlify = {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-netlify'
      ],
      env: {
        NETLIFY_AUTH_TOKEN: env.NETLIFY_AUTH_TOKEN
      }
    };
  }

  // Filesystem MCP Server (always available)
  config.mcpServers.filesystem = {
    command: 'npx',
    args: [
      '-y',
      '@modelcontextprotocol/server-filesystem',
      workspacePath
    ]
  };

  return config;
}

function main() {
  console.log('🔧 MCP Server Configuration Generator\n');
  console.log('This script generates MCP server configuration for Cursor.\n');

  const env = loadEnvFile();
  const config = generateMCPConfig(env);

  console.log('📋 Generated MCP Configuration:\n');
  console.log('Copy this into your Cursor settings.json file:');
  console.log('(File location: %APPDATA%\\Cursor\\User\\settings.json)\n');
  console.log('─'.repeat(60));
  console.log(JSON.stringify(config, null, 2));
  console.log('─'.repeat(60));
  
  console.log('\n📝 Instructions:');
  console.log('1. Open Cursor Settings (Ctrl+,)');
  console.log('2. Click "Open Settings (JSON)" icon in top right');
  console.log('3. Add the "mcpServers" section to your settings.json');
  console.log('4. Replace placeholder values with your actual credentials');
  console.log('5. Restart Cursor\n');

  console.log('⚠️  Security Notes:');
  console.log('- Never commit your actual credentials to version control');
  console.log('- Consider using environment variables or Cursor\'s secret management');
  console.log('- Review MCP server permissions carefully\n');

  console.log('📚 For more information, see: MCP_SERVER_SETUP.md\n');
}

main();

