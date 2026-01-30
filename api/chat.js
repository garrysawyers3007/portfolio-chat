/**
 * Vercel Serverless Function - Chat Proxy
 * Securely handles OpenAI chat completions with tool calling support
 */

import { OpenAI } from 'openai';

// CORS helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      messages,
      model = 'gpt-3.5-turbo',
      temperature = 0.2,
      maxTokens = 900,
      tools = null,
    } = req.body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages: must provide non-empty array' });
    }

    // Validate API key exists (server-side only)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || typeof apiKey !== 'string') {
      console.error('OPENAI_API_KEY not configured or invalid:', typeof apiKey);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Initialize OpenAI client with explicit string conversion
    const openai = new OpenAI({ apiKey: String(apiKey) });

    // Build chat completion params
    const params = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    // Add tools if provided (for function calling)
    if (tools && Array.isArray(tools) && tools.length > 0) {
      params.tools = tools;
    }

    // Create chat completion
    const response = await openai.chat.completions.create(params);

    // Return response with tool calls if present
    const message = response.choices[0].message;
    return res.status(200).json({
      content: message.content,
      role: message.role,
      tool_calls: message.tool_calls || null,
      model: response.model,
      usage: response.usage,
    });

  } catch (error) {
    console.error('Chat API error:', error.message);
    
    // Handle rate limits
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again.' });
    }
    
    // Handle invalid API key
    if (error.status === 401) {
      return res.status(500).json({ error: 'Authentication error' });
    }

    // Handle context length errors
    if (error.code === 'context_length_exceeded') {
      return res.status(400).json({ error: 'Message too long. Please shorten your query.' });
    }

    return res.status(500).json({ error: 'Failed to generate response' });
  }
}
