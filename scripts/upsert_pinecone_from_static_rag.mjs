#!/usr/bin/env node

/**
 * Upsert Static RAG Vectors to Pinecone
 *
 * Reads:
 * - public/rag/meta.json (chunk metadata array)
 * - public/rag/texts.txt (chunk content, delimited by "\n\n---\n\n")
 * - public/rag/vectors.f32 (Float32 embeddings, concatenated)
 *
 * Upserts to Pinecone in batches of 100 with proper IDs and metadata.
 *
 * Usage:
 *   node scripts/upsert_pinecone_from_static_rag.mjs
 *
 * Environment Variables (required):
 *   - PINECONE_API_KEY
 *   - PINECONE_INDEX
 *   - PINECONE_NAMESPACE (optional)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Configuration
const BATCH_SIZE = 100;
const RAG_DIR = path.join(projectRoot, 'public', 'rag');
const META_FILE = path.join(RAG_DIR, 'meta.json');
const TEXTS_FILE = path.join(RAG_DIR, 'texts.txt');
const VECTORS_FILE = path.join(RAG_DIR, 'vectors.f32');

/**
 * Log with timestamp
 */
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Load and validate environment variables
 */
function loadEnv() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  const namespace = process.env.PINECONE_NAMESPACE || '';

  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }
  if (!indexName) {
    throw new Error('PINECONE_INDEX environment variable is required');
  }

  log(`Using Pinecone Index: ${indexName}`);
  if (namespace) {
    log(`Using Namespace: ${namespace}`);
  }

  return { apiKey, indexName, namespace };
}

/**
 * Load metadata from meta.json
 */
function loadMetadata() {
  if (!fs.existsSync(META_FILE)) {
    throw new Error(`Metadata file not found: ${META_FILE}`);
  }

  const rawMeta = fs.readFileSync(META_FILE, 'utf-8');
  const parsed = JSON.parse(rawMeta);

  // Handle both array and object formats
  const items = Array.isArray(parsed) ? parsed : parsed.items || [];

  if (items.length === 0) {
    throw new Error('No metadata items found in meta.json');
  }

  // Infer embedding dimension from first item
  let dimension = 3072; // default for text-embedding-3-large
  if (items[0]?.embedding_dim) {
    dimension = items[0].embedding_dim;
  }

  return { items, dimension };
}

/**
 * Load text chunks from texts.txt using metadata offsets
 * Falls back to delimiters if offsets unavailable
 */
function loadTexts(metadata) {
  if (!fs.existsSync(TEXTS_FILE)) {
    throw new Error(`Texts file not found: ${TEXTS_FILE}`);
  }

  const allText = fs.readFileSync(TEXTS_FILE, 'utf-8');
  const buffer = fs.readFileSync(TEXTS_FILE);

  let chunks = [];

  // Strategy 1: Use text_offset and text_length from metadata (most accurate)
  if (metadata && metadata.length > 0) {
    const firstItem = metadata[0];
    
    if (firstItem.text_offset !== undefined && firstItem.text_length !== undefined) {
      for (let i = 0; i < metadata.length; i++) {
        const { text_offset, text_length } = metadata[i];
        
        if (typeof text_offset !== 'number' || typeof text_length !== 'number') {
          continue;
        }

        // Extract chunk using byte offsets
        try {
          const chunkBuffer = buffer.slice(text_offset, text_offset + text_length);
          const chunkText = chunkBuffer.toString('utf-8').trim();
          
          if (chunkText.length > 0) {
            chunks.push(chunkText);
          }
        } catch (err) {
          // Skip unparseable chunks
        }
      }

      if (chunks.length > 0) {
        return chunks;
      }
    }
  }

  // Strategy 2: Try splitting by "\n\n---\n\n" delimiter
  const preferredDelimiter = '\n\n---\n\n';
  if (allText.includes(preferredDelimiter)) {
    chunks = allText.split(preferredDelimiter).map((c) => c.trim()).filter((c) => c.length > 0);
    if (chunks.length > 0) return chunks;
  }
  
  // Strategy 3: Try splitting by "PATH:" markers heading new chunks
  if (allText.includes('PATH:')) {
    const lines = allText.split('\n');
    let currentChunk = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('PATH:') && currentChunk.length > 0) {
        const chunkText = currentChunk.join('\n').trim();
        if (chunkText.length > 0) {
          chunks.push(chunkText);
        }
        currentChunk = [line];
      } else {
        currentChunk.push(line);
      }
    }

    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join('\n').trim();
      if (chunkText.length > 0) {
        chunks.push(chunkText);
      }
    }
    
    if (chunks.length > 0) return chunks;
  }
  
  // Strategy 4: Try splitting by "---" on its own line
  if (allText.includes('\n---\n')) {
    chunks = allText.split(/\n---\n+/).map((c) => c.trim()).filter((c) => c.length > 0);
    if (chunks.length > 0) return chunks;
  }
  
  // Fallback: treat entire file as single chunk
  chunks = [allText.trim()];
  return chunks;
}

/**
 * Load embeddings from vectors.f32
 */
function loadEmbeddings(dimension) {
  if (!fs.existsSync(VECTORS_FILE)) {
    throw new Error(`Vectors file not found: ${VECTORS_FILE}`);
  }

  const buffer = fs.readFileSync(VECTORS_FILE);
  const vectors = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);

  const numVectors = Math.floor(vectors.length / dimension);

  if (vectors.length % dimension !== 0) {
    console.warn(
      `Warning: Vector array length (${vectors.length}) is not divisible by dimension (${dimension})`
    );
  }

  return { vectors, numVectors };
}

/**
 * Generate unique ID for a vector
 */
function generateId(meta, index) {
  const repo = meta.repo || 'unknown';
  const source = meta.source || meta.path || 'chunk';
  return `${repo}:${source}:${index}`.replace(/\s+/g, '_').toLowerCase();
}

/**
 * Extract and prepare metadata object
 */
function prepareMetadata(meta, text) {
  return {
    text: text.substring(0, 30000), // Pinecone has metadata size limits
    repo: meta.repo || '',
    source: meta.source || meta.path || '',
    path: meta.path || '',
    section: meta.section || '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    file_path: meta.file_path || '',
    chunk_id: meta.chunk_id || '',
  };
}

/**
 * Upsert vectors to Pinecone in batches
 */
async function upsertToPinecone(pc, indexName, namespace, metadata, chunks, vectors, dimension) {
  const index = pc.Index(indexName);

  const totalItems = Math.min(metadata.length, chunks.length, Math.floor(vectors.length / dimension));
  let upsertedCount = 0;

  log(`Preparing to upsert ${totalItems} vectors in batches of ${BATCH_SIZE}...`);

  for (let batchStart = 0; batchStart < totalItems; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, totalItems);
    const batch = [];

    for (let i = batchStart; i < batchEnd; i++) {
      try {
        const meta = metadata[i];
        const text = chunks[i] || '';
        const vectorSlice = vectors.slice(i * dimension, (i + 1) * dimension);

        // Validate vector dimension
        if (vectorSlice.length !== dimension) {
          continue;
        }

        // Check if vector is all zeros (invalid embedding)
        let hasNonZero = false;
        for (let j = 0; j < Math.min(vectorSlice.length, 10); j++) {
          if (vectorSlice[j] !== 0) {
            hasNonZero = true;
            break;
          }
        }
        if (!hasNonZero) {
          continue;
        }

        const id = generateId(meta, i);
        const metadataObj = prepareMetadata(meta, text);

        batch.push({
          id,
          values: Array.from(vectorSlice),
          metadata: metadataObj,
        });
      } catch (err) {
        // Skip unparseable items
      }
    }

    if (batch.length === 0) {
      continue;
    }
    
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;

    try {
      // Ensure all vectors are properly formatted
      for (let record of batch) {
        if (!record.id || !Array.isArray(record.values) && !(record.values instanceof Float32Array)) {
          throw new Error(`Invalid record: missing id or values`);
        }
        if (record.values.length !== dimension) {
          throw new Error(`Invalid vector dimension: ${record.values.length} !== ${dimension}`);
        }
      }

      // Pinecone v7 SDK: expects { records: [...], namespace?: "..." }
      const upsertOptions = { records: batch };
      if (namespace) {
        upsertOptions.namespace = namespace;
      }
      
      try {
        await index.upsert(upsertOptions);
      } catch (error) {
        throw new Error(`Failed to upsert batch ${batchNum}: ${error.message}`);
      }
      upsertedCount += batch.length;

      const progress = Math.floor((upsertedCount / totalItems) * 100);
      log(`Batch ${batchNum}: ${batch.length} vectors (${progress}% complete)`);
    } catch (error) {
      console.error(`\n❌ Error upserting batch starting at index ${batchStart}:`);
      console.error(`Message: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Response:`, error.response.data || error.response);
      }
      if (error.code) console.error(`Code: ${error.code}`);
      throw error;
    }
  }

  return upsertedCount;
}

/**
 * Main execution
 */
async function main() {
  try {
    log('Starting Pinecone upsert from static RAG files...');

    // Load configuration
    const { apiKey, indexName, namespace } = loadEnv();

    // Load data
    const { items: metadata, dimension } = loadMetadata();
    const chunks = loadTexts(metadata);  // Pass metadata for offset-based chunk extraction
    const { vectors, numVectors } = loadEmbeddings(dimension);

    // Validate consistency
    log(`\n📊 Data Source Summary:`);
    log(`  - Metadata items: ${metadata.length}`);
    log(`  - Text chunks: ${chunks.length}`);
    log(`  - Embedding vectors: ${numVectors}`);
    
    if (chunks.length === 0) {
      log(`\n❌ CRITICAL: No text chunks loaded!`);
      log(`Metadata has text_offset? ${metadata.length > 0 && metadata[0].text_offset !== undefined}`);
      log(`First metadata item:`, JSON.stringify(metadata[0], null, 2).slice(0, 500));
      throw new Error('Failed to load text chunks from texts.txt');
    }

    const minCount = Math.min(metadata.length, chunks.length, numVectors);
    if (minCount === 0) {
      throw new Error('No data to upsert (one or more data sources is empty)');
    }

    if (minCount < metadata.length || minCount < numVectors) {
      log(`⚠️ Data mismatch detected:`);
      log(`  - Metadata items: ${metadata.length}`);
      log(`  - Text chunks: ${chunks.length}`);
      log(`  - Embedding vectors: ${numVectors}`);
      log(`  - Will upsert: ${minCount} (limited by smallest source)`);
      log(`  Hint: If metadata/vectors are newer than text chunks, regenerate RAG index to sync them.`);
    }

    log(`Will upsert ${minCount} vectors`);

    // Initialize Pinecone
    const pc = new Pinecone({ apiKey });
    
    // Check index stats
    const index = pc.Index(indexName);
    try {
      const stats = await index.describeIndexStats();
      const indexDim = stats.dimension;
      
      if (indexDim !== dimension) {
        throw new Error(
          `❌ DIMENSION MISMATCH: Index is ${indexDim}-dimensional but embeddings are ${dimension}-dimensional.\n` +
          `   Solution: Recreate the Pinecone index with dimension=${dimension} (or use text-embedding-3-small for 1536 dims).`
        );
      }
    } catch (err) {
      if (err.message.includes('DIMENSION MISMATCH')) throw err;
      console.error(`Error checking index: ${err.message}`);
      throw err;
    }

    // Upsert to Pinecone
    const upsertedCount = await upsertToPinecone(
      pc,
      indexName,
      namespace,
      metadata.slice(0, minCount),
      chunks.slice(0, minCount),
      vectors,
      dimension
    );

    // Summary
    log('='.repeat(60));
    log('✅ Upsert completed successfully!');
    log(`Total vectors upserted: ${upsertedCount}`);
    log(`Index: ${indexName}`);
    if (namespace) {
      log(`Namespace: ${namespace}`);
    }
    log(`Dimension: ${dimension}`);
    log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error during upsert:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run
main();
