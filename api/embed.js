/**
 * Vercel Serverless Function - Embedding Proxy
 * Securely handles OpenAI embedding requests without exposing API key to client
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
    const { input, model = 'text-embedding-3-large' } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Invalid input: must provide string input' });
    }

    // Validate API key exists (server-side only, never exposed to client)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || typeof apiKey !== 'string') {
      console.error('OPENAI_API_KEY not configured or invalid:', typeof apiKey);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Initialize OpenAI client with explicit string conversion
    const openai = new OpenAI({ apiKey: String(apiKey) });

    // Create embedding
    const response = await openai.embeddings.create({
      model,
      input,
    });

    // Return embedding vector
    return res.status(200).json({
      embedding: response.data[0].embedding,
      model: response.model,
      usage: response.usage,
    });

  } catch (error) {
    console.error('Embedding API error:', error.message);
    
    // Handle rate limits
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again.' });
    }
    
    // Handle invalid API key
    if (error.status === 401) {
      return res.status(500).json({ error: 'Authentication error' });
    }

    return res.status(500).json({ error: 'Failed to generate embedding' });
  }
}
