# Langchain RAG Setup Guide

## Overview
This portfolio chat application uses Langchain for Retrieval-Augmented Generation (RAG). It reads your portfolio data from `src/data/` folder and uses it to provide context-aware responses via an LLM. **All processing happens client-side in the browser!**

## Architecture
```
React Frontend
    ↓
ChatAPIClient (src/services/chatAPIClient.js)
    ↓
RAG Service (src/services/ragService.js)
    ↓
Langchain (in-browser)
    ├── OpenAI Embeddings (text-embedding-ada-002)
    ├── MemoryVectorStore (in-memory vector DB)
    └── RetrievalQAChain (retrieval + LLM generation)
    ↓
OpenAI API
```

## Prerequisites
- Node.js 16+ and npm
- OpenAI API key (get one at https://platform.openai.com/api-keys)

## Setup Steps

### Step 1: Frontend Configuration
Create `.env.local` in project root:
```
REACT_APP_OPENAI_API_KEY=sk-...your_api_key...
REACT_APP_LLM_MODEL=gpt-3.5-turbo
REACT_APP_RAG_ENABLED=true
```

### Step 2: Install Dependencies
```bash
npm install
npm install langchain openai
```

### Step 3: Portfolio Data
Ensure your data files are in both locations:
- **Source**: `src/data/site_data.json` (for development)
- **Serve**: `public/data/site_data.json` (for browser access - copy from src/data)

**Example site_data.json structure:**
```json
{
  "name": "Gauransh Sawhney",
  "title": "Software Development Engineer",
  "background": "Wireless Communications & Development",
  "experience": [
    {
      "company": "Company Name",
      "role": "SDE II",
      "duration": "2020 - Present",
      "description": "..."
    }
  ],
  "skills": ["Python", "React", "Wireless Systems", "..."],
  "projects": [...]
}
```

### Step 4: Run Application
```bash
npm start
```
Opens http://localhost:3000

**That's it! No backend server needed.** ✨

## How RAG Works

1. **Load**: First message triggers `ragService.initialize()`
2. **Fetch**: Portfolio data loaded from `public/data/site_data.json`
3. **Embed**: Document text converted to vectors using OpenAI embeddings
4. **Store**: Vectors stored in in-memory MemoryVectorStore
5. **Retrieve**: User query embedded and matched against documents
6. **Generate**: LLM receives query + relevant context to generate response

Example flow:
```
User: "What's your experience with wireless systems?"
     ↓
Retrieve: Finds relevant experience/project sections
     ↓
Prompt: "Based on: [portfolio context], answer: What's your experience with wireless systems?"
     ↓
Response: "I have 5+ years in wireless communications including..."
```

## Troubleshooting

### "REACT_APP_OPENAI_API_KEY not found"
- Create `.env.local` file in project root
- Add your OpenAI API key
- Restart `npm start` to reload environment variables

### "API error: 401"
- Verify API key in `.env.local` is correct
- Ensure API key has available credits

### "RAG not initialized"
- Check browser console for Langchain initialization errors
- Ensure `public/data/site_data.json` exists
- Verify JSON is valid format

### "Network error fetching site_data.json"
- Copy `src/data/site_data.json` to `public/data/site_data.json`
- Browser can only access files in `public/` folder
- Restart dev server after copying files

### Long initial delay on first message
- Normal! Langchain initializes embeddings (~2-3 seconds)
- Subsequent messages are faster (cached embeddings)

## Customization

### Change LLM Model
In `.env.local`:
```
REACT_APP_LLM_MODEL=gpt-4
```

### Disable RAG (use base LLM only)
In `.env.local`:
```
REACT_APP_RAG_ENABLED=false
```

### Add More Data Sources
1. Add `.json` or `.txt` files to `src/data/`
2. Copy to `public/data/`
3. Restart dev server
4. Data automatically loaded on next chat message

## Security Notes

⚠️ **API Key Exposure**: REACT_APP_OPENAI_API_KEY is exposed in browser code
- This is fine for personal/portfolio projects
- For production with real traffic, use a backend proxy to hide the key
- Implement rate limiting and cost controls on backend

⚠️ **Never commit `.env.local`**: Add to `.gitignore`
- API keys should only be in local environment
- For production, use deployment platform's environment variables (Vercel, Netlify, etc.)

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ❌ IE 11 (not supported)

Langchain requires modern JavaScript features (ES2020+).

## Performance Considerations

- **First message**: ~2-3s (initializing embeddings)
- **Subsequent messages**: ~1-2s (API call + response)
- **Memory usage**: Depends on portfolio size (usually <50MB)
- **Bundle size**: Langchain adds ~800KB to bundle (gzipped)

For production optimization:
- Consider service worker caching for embeddings
- Implement streaming responses for perceived speed
- Use Vercel Edge Functions or Cloudflare Workers for cost optimization

## Next Steps

1. ✅ Fill in `.env.local` with your OpenAI API key
2. ✅ Copy portfolio data to `public/data/`
3. ✅ Run `npm start`
4. ✅ Test with suggestion chips or free-form questions
5. 🔄 Optional: Add streaming responses for real-time typing
6. 🔄 Optional: Integrate vector database (Pinecone) for production scale

**Happy chatting! 🎉**
