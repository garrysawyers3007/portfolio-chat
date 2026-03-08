/**
 * Vercel Serverless Function - Pinecone Vector Retrieval
 * 
 * Part of the RAG pipeline:
 * Client (chatAPIClient.js) → /api/retrieve.js → Pinecone + OpenAI embeddings
 * 
 * This function:
 * 1. Receives a text query from the client
 * 2. Embeds it using OpenAI text-embedding-3-large (3072 dimensions)
 * 3. Queries the Pinecone vector index with semantic similarity
 * 4. Applies optional metadata filters (repo, tags)
 * 5. Returns top-K matches with scores and metadata for RAG context injection
 * 
 * Security: API keys (OPENAI_API_KEY, PINECONE_API_KEY) are server-side only.
 * Client never sees these credentials.
 */

import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

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
    // Parse and validate request body
    const { query, topK = 8, filters = {} } = req.body;

    // Validate query parameter
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid query: must provide non-empty string' });
    }

    // Validate topK if provided
    const limit = Number(topK) || 6;
    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Invalid topK: must be between 1 and 100' });
    }

    // Validate environment variables
    const openaiKey = process.env.OPENAI_API_KEY;
    const pineconeKey = process.env.PINECONE_API_KEY;
    const pineconeIndex = process.env.PINECONE_INDEX;

    if (!openaiKey || typeof openaiKey !== 'string') {
      console.error('OPENAI_API_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!pineconeKey || typeof pineconeKey !== 'string') {
      console.error('PINECONE_API_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!pineconeIndex || typeof pineconeIndex !== 'string') {
      console.error('PINECONE_INDEX not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Step 1: Generate embedding using OpenAI
    const openai = new OpenAI({ apiKey: String(openaiKey) });
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query.trim(),
      encoding_format: 'float',
    });

    if (!embeddingResponse.data || embeddingResponse.data.length === 0) {
      console.error('No embedding generated for query');
      return res.status(500).json({ error: 'Failed to generate embedding' });
    }

    const vector = embeddingResponse.data[0].embedding;

    // Step 2: Query Pinecone with the vector
    const pc = new Pinecone({ apiKey: String(pineconeKey) });
    const index = pc.Index(pineconeIndex);

    // Build query parameters
    const queryParams = {
      vector,
      topK: limit,
      includeMetadata: true,
      includeValues: false,
    };

    // Apply optional namespace if configured
    if (process.env.PINECONE_NAMESPACE) {
      queryParams.namespace = process.env.PINECONE_NAMESPACE;
    }

    // Apply metadata filters if provided
    // Supports filtering by repo and/or tags
    if (filters && typeof filters === 'object') {
      const filterObj = {};

      if (filters.repo && typeof filters.repo === 'string') {
        filterObj.repo = { $eq: filters.repo };
      }

      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        filterObj.tags = { $in: filters.tags };
      }

      if (Object.keys(filterObj).length > 0) {
        queryParams.filter = filterObj;
      }
    }

    // Execute Pinecone query
    const results = await index.query(queryParams);

    // Step 3: Format and return results
    const matches = (results.matches || []).map((match) => ({
      score: match.score || 0,
      id: match.id,
      metadata: match.metadata || {},
    }));

    return res.status(200).json({
      matches,
      count: matches.length,
      model: 'text-embedding-3-large',
      query: query.trim(),
    });

  } catch (error) {
    console.error('Retrieval API error:', error.message);

    // Handle OpenAI rate limits
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again.' });
    }

    // Handle OpenAI authentication errors
    if (error.status === 401) {
      return res.status(500).json({ error: 'Authentication error' });
    }

    // Handle Pinecone connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('Pinecone connection failed:', error.message);
      return res.status(500).json({ error: 'Vector database connection error' });
    }

    // Generic error handling
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ error: 'Failed to retrieve vectors' });
  }
}
