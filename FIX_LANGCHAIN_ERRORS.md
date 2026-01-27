# Fix Langchain Import Errors

## Issue
The Langchain imports need `@langchain/openai` package which was not installed.

## Solution

Run this command to install the required Langchain integration:

```bash
npm install @langchain/openai
```

Then restart your dev server:

```bash
npm start
```

## What This Does

The `@langchain/openai` package provides browser-compatible exports for:
- `ChatOpenAI` - LLM interface for chat
- `OpenAIEmbeddings` - Vector embeddings generation

This is separate from the main `langchain` package and needs to be installed explicitly.

## After Installation

The errors should be resolved and you'll be able to:
1. Initialize Langchain RAG on first message
2. Load your portfolio data from `public/data/site_data.json`
3. Generate context-aware responses with OpenAI

Enjoy! 🚀
