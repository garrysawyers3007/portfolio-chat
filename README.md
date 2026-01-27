# Portfolio Chat

An interactive AI-powered portfolio built with React, featuring a client-side RAG (Retrieval-Augmented Generation) chatbot. No backend server required—everything runs in the browser.

## 🎯 Features

- **AI Chat Assistant** - Ask questions about projects, experience, education, and skills
- **Client-Side RAG** - Binary-indexed retrieval with pre-computed embeddings for instant responses
- **Auto-Navigation** - Chat responses include smart action tags that automatically scroll to relevant portfolio sections
- **Dark/Light Themes** - CSS variable-based theming with system preference detection
- **Responsive Design** - Mobile-first layout with accessibility-first patterns
- **Email Link Conversion** - Automatically converts emails to clickable `mailto:` links

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- OpenAI API key (for GPT and embeddings)

### Setup (5 minutes)

```bash
# 1. Clone and install dependencies
git clone <repo>
cd portfolio-chat
npm install

# 2. Create .env.local with your OpenAI API key
echo "REACT_APP_OPENAI_API_KEY=sk-..." > .env.local
echo "REACT_APP_LLM_MODEL=gpt-3.5-turbo" >> .env.local

# 3. Start development server
npm start
# Opens at http://localhost:3000
```

### Production Build

```bash
npm run build
# Creates optimized build in ./build
```

## 🏗️ Architecture

### Data Flow (All Client-Side)
```
User Input 
  → ChatAPIClient 
  → RAGService (query + retrieve)
  → OpenAI API (embeddings + LLM)
  → Response with action tags
  → ChatHistory (parse + execute navigation)
```

### Key Components

**Services:**
- `src/services/ragService.js` - Binary RAG engine + LLM (599 lines)
- `src/services/chatAPIClient.js` - Simple wrapper API

**Components:**
- `src/components/ChatHistory.js` - Message display + action tag parser
- `src/components/InputArea.js` - User text input
- `src/components/TopNav.js` - Header + theme toggle
- `src/components/SuggestionChips.js` - Quick action buttons

**Pages:**
- `src/pages/AboutMe.js` - Profile section
- `src/pages/Education.js` - Degrees, GPA, credentials
- `src/pages/Experience.js` - Work history timeline
- `src/pages/Projects.js` - GitHub projects grid
- `src/pages/ContactMe.js` - Email, socials

**Assets:**
- `public/data/resume.json` - Portfolio content (skills, projects, experience)
- `public/rag/` - Binary index:
  - `meta.json` - Metadata + item offsets
  - `vectors.f32` - Pre-computed L2-normalized embeddings
  - `texts.txt` - Concatenated chunk texts

## 🧠 How RAG Works

### Binary Index Retrieval
Instead of loading embeddings as JSON, we use optimized binary formats:

1. **Query Embedding** - User question → OpenAI text-embedding-3-small
2. **Similarity Search** - Dot product against pre-computed vectors (O(n))
3. **Context Formatting** - Top-k chunks deduplicated by file, formatted with citations
4. **LLM Generation** - ChatOpenAI generates response with portfolio context

### Action Tags for Navigation
Responses can include tags like `<<ACTION:SCROLL_PROJECTS>>` which automatically:
- Close the chat panel
- Scroll to the matching section (About, Education, Experience, Projects, Contact)
- Provide seamless UX without explicit clicks

**Example:**
```
User: "Tell me about your projects"
LLM: "I've built several projects including Image Coloration, which uses deep learning..."
     "<<ACTION:SCROLL_PROJECTS>>"
→ Chat closes, page scrolls to projects section
```

## 📋 Configuration

### Environment Variables

```bash
# Required
REACT_APP_OPENAI_API_KEY=sk-...  # Your OpenAI API key

# Optional
REACT_APP_LLM_MODEL=gpt-3.5-turbo  # Default model (or gpt-4, gpt-4-turbo, etc.)
REACT_APP_RAG_ENABLED=true         # Enable/disable RAG (default: true)
```

### Customizing Content

Edit `public/data/resume.json`:
```json
{
  "basic_info": {
    "description": "Your bio"
  },
  "skills": [...],
  "experience": [...],
  "education": [...],
  "projects": [...],
  "socials": [...]
}
```

Then regenerate the RAG index (see Binary Index Generation below).

## 🔄 Binary Index Generation

To rebuild the RAG index after updating `resume.json`:

```bash
# Using Python (requires langchain, openai, numpy)
python scripts/generate_rag_index.py
# Outputs to: public/rag/{meta.json, vectors.f32, texts.txt}
```

**Index structure:**
- `count` - Number of text chunks
- `dim` - Embedding dimension (1536 for text-embedding-3-small)
- `items` - Array of metadata (project_name, file_path, text_offset, text_length, start_line, end_line)

## 🎨 Theming

### CSS Variables System
All colors, spacing, and typography are defined in `src/index.css`:

```css
:root[data-theme="dark"] {
  --bg: #0B0F19;
  --text: #E5E7EB;
  --primary: #22D3EE;
}

:root[data-theme="light"] {
  --bg: #F1F5F9;
  --text: #0F172A;
  --primary: #0EA5E9;
}
```

**To update theme colors:**
1. Edit `src/index.css` CSS variables
2. All components automatically inherit new colors
3. Test both dark/light modes (TopNav toggle)

## 📱 Responsive Design

- **Mobile (375px)** - Single column, vertical navigation
- **Tablet (768px)** - Two-column layout where applicable
- **Desktop (1024px+)** - Full-width layouts with sidebars

All layouts tested with:
- Chrome DevTools Device Mode
- Firefox Responsive Design Mode
- Touch-friendly targets (44×44px minimum)

## ♿ Accessibility

- ✅ Semantic HTML (`<nav>`, `<button>`, `<section>`)
- ✅ ARIA labels for screen readers
- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ Focus indicators on all interactive elements
- ✅ Respects `prefers-reduced-motion` for animations
- ✅ Alt text for images

## 🐛 Debugging

### RAG Not Initializing?
```javascript
// Browser console
import ragService from './services/ragService.js';
await ragService.initialize();
console.log(ragService.getStatus());
// Should show: { initialized: true, indexLoaded: true, apiKey: 'configured' }
```

### Check Network Requests
- `GET /data/resume.json` - Portfolio content
- `GET /rag/meta.json` - Index metadata
- `GET /rag/vectors.f32` - Embeddings (binary)
- `GET /rag/texts.txt` - Text chunks

All should return 200 OK in DevTools Network tab.

### Action Tags Not Working?
- Verify ChatHistory.js has regex: `/<?<?ACTION:SCROLL_[A-Z_]+>?>?/g`
- Check target elements have correct IDs: `about-me`, `education`, `experience`, `projects`, `contact`
- Look for console errors during scroll execution

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel --prod
# Automatically uses .env.local for env vars
```

### GitHub Pages
```bash
npm run build
# Deploy ./build folder to GitHub Pages
```

### Other Platforms
1. Run `npm run build`
2. Deploy the `build/` folder as static content
3. Set environment variables in deployment platform:
   - `REACT_APP_OPENAI_API_KEY`
   - `REACT_APP_LLM_MODEL`

## ⚠️ Security Notes

- **API Key in Browser:** Your OpenAI API key is exposed in the browser. This is fine for personal/portfolio projects but not for production apps with sensitive keys.
- **For Production:** Add a backend proxy server to hide the API key (call OpenAI from your server, not the browser).
- **Rate Limiting:** Consider adding rate limiting if publicly shared.

## 📚 Documentation

- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) - AI agent guide for developers
- [`CLIENT_SIDE_MIGRATION.md`](CLIENT_SIDE_MIGRATION.md) - Migration from backend to client-side Langchain
- [`DESIGN_TOKENS.md`](DESIGN_TOKENS.md) - Complete CSS variable reference
- [`LANGCHAIN_SETUP.md`](LANGCHAIN_SETUP.md) - Langchain configuration details

## 🛠️ Tech Stack

- **React** 19.2 - UI framework
- **Langchain** - RAG orchestration + LLM integration
- **OpenAI API** - Embeddings (text-embedding-3-small) + LLM (GPT-3.5/4)
- **CSS** - Variable-based theming, no CSS-in-JS
- **Binary Format** - Custom Float32 vector storage

## 📄 License

[Your License Here]

## 👤 Author

Gauransh Sawhney - [gauransh30@gmail.com](mailto:gauransh30@gmail.com)

---

**Last Updated:** January 2026  
**Status:** Production-ready
